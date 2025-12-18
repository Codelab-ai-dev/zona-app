import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/tournament_entity.dart';
import '../../domain/repositories/tournament_repository.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/tournament_mapper.dart';

/// Tournament Repository Implementation
/// Implements tournament data operations using Supabase
class TournamentRepositoryImpl implements TournamentRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  TournamentRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<TournamentEntity>>> getAllTournaments({
    bool onlyActive = false,
  }) async {
    try {
      print('📋 Fetching all tournaments (onlyActive: $onlyActive)...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Build query
      var query = supabaseService.client.from('tournaments').select();

      // Filter by active status if needed
      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      // Execute query with ordering
      final response = await query.order('start_date', ascending: false);

      // Parse response
      final tournaments = (response as List)
          .map((json) => TournamentMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${tournaments.length} tournaments');
      return Right(tournaments);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching tournaments: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching tournaments: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch tournaments: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, TournamentEntity>> getTournamentById(
    String tournamentId,
  ) async {
    try {
      print('🔍 Fetching tournament with ID: $tournamentId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Fetch tournament
      final response = await supabaseService.client
          .from('tournaments')
          .select()
          .eq('id', tournamentId)
          .maybeSingle();

      if (response == null) {
        print('❌ Tournament not found: $tournamentId');
        return Left(NotFoundFailure('Tournament not found'));
      }

      final tournament = TournamentMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully fetched tournament: ${tournament.name}');
      return Right(tournament);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching tournament: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching tournament: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch tournament: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<TournamentEntity>>> getTournamentsByLeagueId(
    String leagueId, {
    bool onlyActive = false,
  }) async {
    try {
      print('📋 Fetching tournaments for league: $leagueId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Build query
      var query = supabaseService.client
          .from('tournaments')
          .select()
          .eq('league_id', leagueId);

      // Filter by active status if needed
      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      // Execute query with ordering
      final response = await query.order('start_date', ascending: false);

      // Parse response
      final tournaments = (response as List)
          .map((json) => TournamentMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${tournaments.length} tournaments for league');
      return Right(tournaments);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching league tournaments: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching league tournaments: $e');
      print('Stack trace: $stackTrace');
      return Left(
        ServerFailure('Failed to fetch league tournaments: ${e.toString()}'),
      );
    }
  }

  @override
  Future<Either<Failure, List<TournamentEntity>>> getActiveTournaments() async {
    try {
      print('📋 Fetching active tournaments...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final now = DateTime.now().toIso8601String();

      // Query for tournaments that are active and currently ongoing
      final response = await supabaseService.client
          .from('tournaments')
          .select()
          .eq('is_active', true)
          .lte('start_date', now)
          .gte('end_date', now)
          .order('start_date', ascending: false);

      // Parse response
      final tournaments = (response as List)
          .map((json) => TournamentMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${tournaments.length} active tournaments');
      return Right(tournaments);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching active tournaments: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching active tournaments: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch active tournaments: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<TournamentEntity>>> getUpcomingTournaments() async {
    try {
      print('📋 Fetching upcoming tournaments...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final now = DateTime.now().toIso8601String();

      // Query for tournaments that haven't started yet
      final response = await supabaseService.client
          .from('tournaments')
          .select()
          .eq('is_active', true)
          .gt('start_date', now)
          .order('start_date', ascending: true);

      // Parse response
      final tournaments = (response as List)
          .map((json) => TournamentMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${tournaments.length} upcoming tournaments');
      return Right(tournaments);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching upcoming tournaments: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching upcoming tournaments: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch upcoming tournaments: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, TournamentEntity>> createTournament({
    required String name,
    required String leagueId,
    required DateTime startDate,
    required DateTime endDate,
    int? maxPlayers,
    int maxCoachingStaff = 10,
    TournamentFormat format = TournamentFormat.league,
    int? numberOfGroups,
    int teamsAdvancingPerGroup = 2,
    int roundsPerSeason = 1,
    bool hasThirdPlaceMatch = false,
  }) async {
    try {
      print('➕ Creating tournament: $name...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Prepare data
      final data = {
        'name': name,
        'league_id': leagueId,
        'start_date': startDate.toIso8601String(),
        'end_date': endDate.toIso8601String(),
        'is_active': false, // New tournaments start inactive
        if (maxPlayers != null) 'max_players': maxPlayers,
        'max_coaching_staff': maxCoachingStaff,
        'tournament_format': format.toDbString(),
        if (numberOfGroups != null) 'number_of_groups': numberOfGroups,
        'teams_advancing_per_group': teamsAdvancingPerGroup,
        'rounds_per_season': roundsPerSeason,
        'has_third_place_match': hasThirdPlaceMatch,
      };

      // Insert tournament
      final response = await supabaseService.client
          .from('tournaments')
          .insert(data)
          .select()
          .single();

      final tournament = TournamentMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully created tournament: ${tournament.name}');
      return Right(tournament);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error creating tournament: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error creating tournament: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to create tournament: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, TournamentEntity>> updateTournament({
    required String tournamentId,
    String? name,
    DateTime? startDate,
    DateTime? endDate,
    bool? isActive,
    int? maxPlayers,
    int? maxCoachingStaff,
    TournamentFormat? format,
    int? numberOfGroups,
    int? teamsAdvancingPerGroup,
    int? roundsPerSeason,
    bool? hasThirdPlaceMatch,
  }) async {
    try {
      print('✏️ Updating tournament: $tournamentId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Prepare data (only include non-null values)
      final data = <String, dynamic>{};
      if (name != null) data['name'] = name;
      if (startDate != null) data['start_date'] = startDate.toIso8601String();
      if (endDate != null) data['end_date'] = endDate.toIso8601String();
      if (isActive != null) data['is_active'] = isActive;
      if (maxPlayers != null) data['max_players'] = maxPlayers;
      if (maxCoachingStaff != null) data['max_coaching_staff'] = maxCoachingStaff;
      if (format != null) data['tournament_format'] = format.toDbString();
      if (numberOfGroups != null) data['number_of_groups'] = numberOfGroups;
      if (teamsAdvancingPerGroup != null) {
        data['teams_advancing_per_group'] = teamsAdvancingPerGroup;
      }
      if (roundsPerSeason != null) data['rounds_per_season'] = roundsPerSeason;
      if (hasThirdPlaceMatch != null) {
        data['has_third_place_match'] = hasThirdPlaceMatch;
      }
      data['updated_at'] = DateTime.now().toIso8601String();

      // Update tournament
      final response = await supabaseService.client
          .from('tournaments')
          .update(data)
          .eq('id', tournamentId)
          .select()
          .single();

      final tournament = TournamentMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully updated tournament: ${tournament.name}');
      return Right(tournament);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error updating tournament: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error updating tournament: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to update tournament: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteTournament(String tournamentId) async {
    try {
      print('🗑️ Deleting tournament: $tournamentId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Soft delete by setting is_active to false
      await supabaseService.client
          .from('tournaments')
          .update({
            'is_active': false,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', tournamentId);

      print('✅ Successfully deleted tournament');
      return const Right(null);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error deleting tournament: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error deleting tournament: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to delete tournament: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<TournamentEntity>>> searchTournaments(
    String query, {
    bool onlyActive = true,
  }) async {
    try {
      print('🔍 Searching tournaments with query: $query...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Build query - search in name
      var supaQuery = supabaseService.client
          .from('tournaments')
          .select()
          .ilike('name', '%$query%');

      // Filter by active status if needed
      if (onlyActive) {
        supaQuery = supaQuery.eq('is_active', true);
      }

      // Execute query with ordering
      final response = await supaQuery.order('start_date', ascending: false);

      // Parse response
      final tournaments = (response as List)
          .map((json) => TournamentMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Found ${tournaments.length} tournaments matching query');
      return Right(tournaments);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error searching tournaments: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error searching tournaments: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to search tournaments: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, TournamentEntity>> activateTournament(
    String tournamentId,
  ) async {
    return updateTournament(
      tournamentId: tournamentId,
      isActive: true,
    );
  }

  @override
  Future<Either<Failure, TournamentEntity>> deactivateTournament(
    String tournamentId,
  ) async {
    return updateTournament(
      tournamentId: tournamentId,
      isActive: false,
    );
  }
}
