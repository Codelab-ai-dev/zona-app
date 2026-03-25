import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/match_entity.dart';
import '../../domain/repositories/match_repository.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/match_mapper.dart';

/// Match Repository Implementation
class MatchRepositoryImpl implements MatchRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  MatchRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<MatchEntity>>> getPendingMatchesByLeague(
    String leagueId,
  ) async {
    try {
      print('📋 Fetching pending matches for league: $leagueId...');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('matches')
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo, slug),
            away_team:teams!matches_away_team_id_fkey(id, name, logo, slug),
            tournament:tournaments!inner(id, name, league_id)
          ''')
          .eq('tournament.league_id', leagueId)
          .inFilter('status', ['scheduled', 'in_progress'])
          .order('match_date', ascending: true)
          .order('match_time', ascending: true)
          .limit(50);

      final matches = (response as List)
          .map((json) => MatchMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${matches.length} pending matches');
      return Right(matches);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching pending matches: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching pending matches: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch pending matches: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<MatchEntity>>> getMatchesByTournament(
    String tournamentId,
  ) async {
    try {
      print('📋 Fetching matches for tournament: $tournamentId...');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('matches')
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo, slug),
            away_team:teams!matches_away_team_id_fkey(id, name, logo, slug),
            tournament:tournaments(id, name)
          ''')
          .eq('tournament_id', tournamentId)
          .order('round', ascending: true)
          .order('match_date', ascending: true)
          .limit(200);

      final matches = (response as List)
          .map((json) => MatchMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${matches.length} matches for tournament');
      return Right(matches);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching matches: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching matches: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch matches: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, MatchEntity>> getMatchById(String matchId) async {
    try {
      print('🔍 Fetching match: $matchId...');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('matches')
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo, slug),
            away_team:teams!matches_away_team_id_fkey(id, name, logo, slug),
            tournament:tournaments(id, name)
          ''')
          .eq('id', matchId)
          .single();

      final match = MatchMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully fetched match: ${match.displayText}');
      return Right(match);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching match: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching match: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch match: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, MatchEntity>> updateMatchResult({
    required String matchId,
    required int homeScore,
    required int awayScore,
  }) async {
    try {
      print('📝 Updating match result: $matchId ($homeScore - $awayScore)...');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Validate scores
      if (homeScore < 0 || awayScore < 0) {
        return Left(ValidationFailure('Los marcadores no pueden ser negativos'));
      }

      final response = await supabaseService.client
          .from('matches')
          .update({
            'home_score': homeScore,
            'away_score': awayScore,
            'status': 'finished',
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', matchId)
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo, slug),
            away_team:teams!matches_away_team_id_fkey(id, name, logo, slug),
            tournament:tournaments(id, name)
          ''')
          .single();

      final match = MatchMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully updated match result: ${match.resultText}');
      return Right(match);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error updating match result: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error updating match result: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to update match result: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, MatchEntity>> updateMatchStatus({
    required String matchId,
    required MatchStatus status,
  }) async {
    try {
      print('📝 Updating match status: $matchId -> ${status.toDbString()}...');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('matches')
          .update({
            'status': status.toDbString(),
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', matchId)
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo, slug),
            away_team:teams!matches_away_team_id_fkey(id, name, logo, slug),
            tournament:tournaments(id, name)
          ''')
          .single();

      final match = MatchMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully updated match status');
      return Right(match);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error updating match status: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error updating match status: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to update match status: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<MatchEntity>>> createMatches(
    List<Map<String, dynamic>> matches,
  ) async {
    try {
      print('📝 Creating ${matches.length} matches...');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      if (matches.isEmpty) {
        return const Right([]);
      }

      final response = await supabaseService.client
          .from('matches')
          .insert(matches)
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo, slug),
            away_team:teams!matches_away_team_id_fkey(id, name, logo, slug),
            tournament:tournaments(id, name)
          ''');

      final created = (response as List)
          .map((json) => MatchMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully created ${created.length} matches');
      return Right(created);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error creating matches: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error creating matches: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to create matches: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<Map<String, dynamic>>>> getExistingMatchPairs(
    String tournamentId,
  ) async {
    try {
      print('🔍 Fetching existing match pairs for tournament: $tournamentId...');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('matches')
          .select('home_team_id, away_team_id, round')
          .eq('tournament_id', tournamentId);

      final pairs = (response as List)
          .map((json) => json as Map<String, dynamic>)
          .toList();

      print('✅ Found ${pairs.length} existing match pairs');
      return Right(pairs);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching match pairs: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching match pairs: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch match pairs: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, MatchEntity>> updateMatchDetails({
    required String matchId,
    required Map<String, dynamic> data,
  }) async {
    try {
      print('📝 Updating match details: $matchId...');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      data['updated_at'] = DateTime.now().toIso8601String();

      final response = await supabaseService.client
          .from('matches')
          .update(data)
          .eq('id', matchId)
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo, slug),
            away_team:teams!matches_away_team_id_fkey(id, name, logo, slug),
            tournament:tournaments(id, name)
          ''')
          .single();

      final match = MatchMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully updated match details');
      return Right(match);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error updating match details: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error updating match details: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to update match details: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteMatches(List<String> matchIds) async {
    try {
      print('🗑️ Deleting ${matchIds.length} matches...');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      if (matchIds.isEmpty) {
        return const Right(null);
      }

      await supabaseService.client
          .from('matches')
          .delete()
          .inFilter('id', matchIds);

      print('✅ Successfully deleted ${matchIds.length} matches');
      return const Right(null);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error deleting matches: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error deleting matches: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to delete matches: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> saveRefereeReport(
    String matchId,
    String observations,
  ) async {
    try {
      print('📝 Saving referee report for match: $matchId...');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      await supabaseService.client.from('match_referee_reports').upsert(
        {
          'match_id': matchId,
          'general_observations': observations,
          'updated_at': DateTime.now().toIso8601String(),
        },
        onConflict: 'match_id',
      );

      print('✅ Successfully saved referee report');
      return const Right(null);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error saving referee report: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error saving referee report: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to save referee report: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, String?>> getRefereeReport(String matchId) async {
    try {
      print('🔍 Fetching referee report for match: $matchId...');

      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('match_referee_reports')
          .select('general_observations')
          .eq('match_id', matchId)
          .maybeSingle();

      if (response == null) {
        return const Right(null);
      }

      final observations = response['general_observations'] as String?;
      print('✅ Fetched referee report');
      return Right(observations);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching referee report: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching referee report: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch referee report: ${e.toString()}'));
    }
  }
}
