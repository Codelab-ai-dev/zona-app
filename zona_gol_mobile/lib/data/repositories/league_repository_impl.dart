import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/league_entity.dart';
import '../../domain/entities/league_stats_entity.dart';
import '../../domain/repositories/league_repository.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/league_mapper.dart';

/// League Repository Implementation
/// Implements league data operations using Supabase
class LeagueRepositoryImpl implements LeagueRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  LeagueRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<LeagueEntity>>> getAllLeagues({
    bool onlyActive = false,
  }) async {
    try {
      print('📋 Fetching all leagues (onlyActive: $onlyActive)...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Build query
      var query = supabaseService.client.from('leagues').select();

      // Filter by active status if needed
      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      // Execute query with ordering
      final response = await query.order('created_at', ascending: false);

      // Parse response
      final leagues = (response as List)
          .map((json) => LeagueMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${leagues.length} leagues');
      return Right(leagues);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching leagues: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching leagues: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch leagues: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, LeagueEntity>> getLeagueById(String leagueId) async {
    try {
      print('🔍 Fetching league with ID: $leagueId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Fetch league
      final response = await supabaseService.client
          .from('leagues')
          .select()
          .eq('id', leagueId)
          .maybeSingle();

      if (response == null) {
        print('❌ League not found: $leagueId');
        return Left(NotFoundFailure('League not found'));
      }

      final league = LeagueMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully fetched league: ${league.name}');
      return Right(league);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching league: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching league: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch league: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, LeagueEntity>> getLeagueBySlug(String slug) async {
    try {
      print('🔍 Fetching league with slug: $slug...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Fetch league
      final response = await supabaseService.client
          .from('leagues')
          .select()
          .eq('slug', slug)
          .maybeSingle();

      if (response == null) {
        print('❌ League not found: $slug');
        return Left(NotFoundFailure('League not found'));
      }

      final league = LeagueMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully fetched league: ${league.name}');
      return Right(league);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching league: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching league: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to fetch league: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<LeagueEntity>>> getLeaguesByAdminId(
    String adminId, {
    bool onlyActive = false,
  }) async {
    try {
      print('📋 Fetching leagues for admin: $adminId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Build query
      var query = supabaseService.client
          .from('leagues')
          .select()
          .eq('admin_id', adminId);

      // Filter by active status if needed
      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      // Execute query with ordering
      final response = await query.order('created_at', ascending: false);

      // Parse response
      final leagues = (response as List)
          .map((json) => LeagueMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Successfully fetched ${leagues.length} leagues for admin');
      return Right(leagues);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error fetching admin leagues: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error fetching admin leagues: $e');
      print('Stack trace: $stackTrace');
      return Left(
        ServerFailure('Failed to fetch admin leagues: ${e.toString()}'),
      );
    }
  }

  @override
  Future<Either<Failure, LeagueEntity>> createLeague({
    required String name,
    required String slug,
    required String description,
    required String adminId,
    String? logo,
    String productMode = 'full',
  }) async {
    try {
      print('➕ Creating league: $name (mode: $productMode)...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Prepare data
      final data = {
        'name': name,
        'slug': slug,
        'description': description,
        'admin_id': adminId,
        'product_mode': productMode,
        if (logo != null) 'logo': logo,
        'is_active': true,
      };

      // Insert league
      final response = await supabaseService.client
          .from('leagues')
          .insert(data)
          .select()
          .single();

      final league = LeagueMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully created league: ${league.name}');

      // Update the admin's user profile with the league_id
      try {
        await supabaseService.client
            .from('users')
            .update({
              'league_id': league.id,
              'updated_at': DateTime.now().toIso8601String(),
            })
            .eq('id', adminId);
        print('✅ Admin league_id assigned successfully');
      } catch (e) {
        print('⚠️ Warning: Could not assign league_id to admin: $e');
        // Don't fail the league creation if this fails
      }

      return Right(league);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error creating league: ${e.message}');

      // Handle unique constraint violation (duplicate slug)
      if (e.code == '23505') {
        return Left(ValidationFailure('El slug ya está en uso'));
      }

      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error creating league: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to create league: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, LeagueEntity>> updateLeague({
    required String leagueId,
    String? name,
    String? slug,
    String? description,
    String? adminId,
    String? logo,
    bool? isActive,
  }) async {
    try {
      print('✏️ Updating league: $leagueId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Prepare data (only include non-null values)
      final data = <String, dynamic>{};
      if (name != null) data['name'] = name;
      if (slug != null) data['slug'] = slug;
      if (description != null) data['description'] = description;
      if (adminId != null) data['admin_id'] = adminId;
      if (logo != null) data['logo'] = logo;
      if (isActive != null) data['is_active'] = isActive;
      data['updated_at'] = DateTime.now().toIso8601String();

      // Update league
      final response = await supabaseService.client
          .from('leagues')
          .update(data)
          .eq('id', leagueId)
          .select()
          .single();

      final league = LeagueMapper.fromJson(response as Map<String, dynamic>);
      print('✅ Successfully updated league: ${league.name}');
      return Right(league);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error updating league: ${e.message}');

      // Handle unique constraint violation (duplicate slug)
      if (e.code == '23505') {
        return Left(ValidationFailure('El slug ya está en uso'));
      }

      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error updating league: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to update league: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteLeague(String leagueId) async {
    try {
      print('🗑️ Deleting league: $leagueId...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Soft delete by setting is_active to false
      await supabaseService.client
          .from('leagues')
          .update({
            'is_active': false,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', leagueId);

      print('✅ Successfully deleted league');
      return const Right(null);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error deleting league: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error deleting league: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to delete league: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<LeagueEntity>>> searchLeagues(
    String query, {
    bool onlyActive = true,
  }) async {
    try {
      print('🔍 Searching leagues with query: $query...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Build query - search in name and description
      var supaQuery = supabaseService.client.from('leagues').select().or(
            'name.ilike.%$query%,description.ilike.%$query%',
          );

      // Filter by active status if needed
      if (onlyActive) {
        supaQuery = supaQuery.eq('is_active', true);
      }

      // Execute query with ordering
      final response = await supaQuery.order('created_at', ascending: false);

      // Parse response
      final leagues = (response as List)
          .map((json) => LeagueMapper.fromJson(json as Map<String, dynamic>))
          .toList();

      print('✅ Found ${leagues.length} leagues matching query');
      return Right(leagues);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error searching leagues: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error searching leagues: $e');
      print('Stack trace: $stackTrace');
      return Left(ServerFailure('Failed to search leagues: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, bool>> isSlugAvailable(
    String slug, {
    String? excludeLeagueId,
  }) async {
    try {
      print('🔍 Checking slug availability: $slug...');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Build query
      var query = supabaseService.client
          .from('leagues')
          .select('id')
          .eq('slug', slug);

      // Exclude specific league ID if provided (for update operations)
      if (excludeLeagueId != null) {
        query = query.neq('id', excludeLeagueId);
      }

      final response = await query.maybeSingle();

      final isAvailable = response == null;
      print('✅ Slug available: $isAvailable');
      return Right(isAvailable);
    } on PostgrestException catch (e) {
      print('❌ Postgrest error checking slug: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Error checking slug: $e');
      print('Stack trace: $stackTrace');
      return Left(
        ServerFailure('Failed to check slug availability: ${e.toString()}'),
      );
    }
  }

  @override
  Future<Either<Failure, LeagueStatsEntity>> getLeagueStats(
      String leagueId) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final client = supabaseService.client;

      // Fetch all data in parallel
      final results = await Future.wait([
        // 0: teams
        client
            .from('teams')
            .select('id')
            .eq('league_id', leagueId)
            .eq('is_active', true),
        // 1: players
        client
            .from('players')
            .select('id, teams!inner(league_id)')
            .eq('teams.league_id', leagueId)
            .eq('is_active', true),
        // 2: matches with scores
        client.from('matches').select(
            'id, status, match_date, home_score, away_score, home_team:teams!matches_home_team_id_fkey(league_id)'),
        // 3: cards (player_stats)
        client.from('player_stats').select(
            'yellow_cards, red_cards, goals, matches!inner(home_team:teams!matches_home_team_id_fkey(league_id))'),
        // 4: upcoming matches
        client
            .from('matches')
            .select(
                'id, match_date, status, home_team:teams!matches_home_team_id_fkey(name, league_id), away_team:teams!matches_away_team_id_fkey(name)')
            .eq('status', 'scheduled')
            .order('match_date', ascending: true)
            .limit(10),
      ]);

      // Teams count
      final teamsCount = (results[0] as List).length;

      // Players count
      final playersCount = (results[1] as List).length;

      // Matches - filter to this league
      final allMatches = (results[2] as List)
          .where((m) => m['home_team'] != null)
          .toList();
      final completedMatches =
          allMatches.where((m) => m['status'] == 'completed').toList();
      final matchesPlayed = completedMatches.length;
      final matchesPending =
          allMatches.where((m) => m['status'] == 'scheduled').length;

      // Total goals from matches
      int totalGoals = 0;
      for (final m in completedMatches) {
        totalGoals +=
            ((m['home_score'] ?? 0) as int) + ((m['away_score'] ?? 0) as int);
      }

      // Cards from player_match_stats
      int totalYellowCards = 0;
      int totalRedCards = 0;
      final statsData = (results[3] as List).where((s) {
        final match = s['matches'] as Map<String, dynamic>?;
        final homeTeam = match?['home_team'] as Map<String, dynamic>?;
        return homeTeam?['league_id'] == leagueId;
      }).toList();
      for (final s in statsData) {
        totalYellowCards += (s['yellow_cards'] ?? 0) as int;
        totalRedCards += (s['red_cards'] ?? 0) as int;
      }

      // Monthly stats
      final now = DateTime.now();
      final startOfMonth = DateTime(now.year, now.month, 1);
      final thisMonthMatches = completedMatches.where((m) {
        final matchDate = DateTime.tryParse(m['match_date'] ?? '');
        return matchDate != null && matchDate.isAfter(startOfMonth);
      }).toList();
      final matchesThisMonth = thisMonthMatches.length;
      int goalsThisMonth = 0;
      for (final m in thisMonthMatches) {
        goalsThisMonth +=
            ((m['home_score'] ?? 0) as int) + ((m['away_score'] ?? 0) as int);
      }

      // Result distribution
      int homeWins = 0;
      int draws = 0;
      int awayWins = 0;
      for (final m in completedMatches) {
        final home = (m['home_score'] ?? 0) as int;
        final away = (m['away_score'] ?? 0) as int;
        if (home > away) {
          homeWins++;
        } else if (home == away) {
          draws++;
        } else {
          awayWins++;
        }
      }

      // Monthly matches (last 6 months)
      final monthNames = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
      ];
      final monthlyMatches = <MonthlyMatchData>[];
      for (int i = 5; i >= 0; i--) {
        final month = DateTime(now.year, now.month - i, 1);
        final nextMonth = DateTime(month.year, month.month + 1, 1);
        final count = completedMatches.where((m) {
          final matchDate = DateTime.tryParse(m['match_date'] ?? '');
          return matchDate != null &&
              matchDate
                  .isAfter(month.subtract(const Duration(days: 1))) &&
              matchDate.isBefore(nextMonth);
        }).length;
        monthlyMatches.add(MonthlyMatchData(
          month: monthNames[month.month - 1],
          count: count,
        ));
      }

      // Upcoming matches (filter to this league)
      final upcomingRaw = (results[4] as List).where((m) {
        final homeTeam = m['home_team'] as Map<String, dynamic>?;
        return homeTeam?['league_id'] == leagueId;
      }).take(5).toList();

      final upcomingMatches = upcomingRaw.map((m) {
        final homeTeam = m['home_team'] as Map<String, dynamic>?;
        final awayTeam = m['away_team'] as Map<String, dynamic>?;
        return UpcomingMatchInfo(
          id: m['id'] as String,
          homeName: homeTeam?['name'] ?? 'Local',
          awayName: awayTeam?['name'] ?? 'Visitante',
          matchDate:
              DateTime.tryParse(m['match_date'] ?? '') ?? DateTime.now(),
        );
      }).toList();

      // Top scorer
      TopScorerInfo? topScorer;
      try {
        final topScorerResult = await client
            .from('player_stats')
            .select(
                'goals, players!inner(name, teams!inner(name, league_id))')
            .eq('players.teams.league_id', leagueId)
            .gt('goals', 0)
            .order('goals', ascending: false)
            .limit(50);

        // Aggregate goals by player
        final playerGoals = <String, _PlayerGoalAgg>{};
        for (final row in (topScorerResult as List)) {
          final player = row['players'] as Map<String, dynamic>?;
          if (player == null) continue;
          final team = player['teams'] as Map<String, dynamic>?;
          final name = (player['name'] as String? ?? '').trim();
          final teamName = team?['name'] ?? '';
          final goals = (row['goals'] ?? 0) as int;
          if (playerGoals.containsKey(name)) {
            playerGoals[name]!.goals += goals;
          } else {
            playerGoals[name] = _PlayerGoalAgg(name, teamName, goals);
          }
        }

        if (playerGoals.isNotEmpty) {
          final top = playerGoals.values.reduce(
              (a, b) => a.goals >= b.goals ? a : b);
          if (top.goals > 0) {
            topScorer = TopScorerInfo(
              playerName: top.name,
              teamName: top.teamName,
              goals: top.goals,
            );
          }
        }
      } catch (_) {
        // Top scorer is optional, don't fail if query errors
      }

      return Right(LeagueStatsEntity(
        teamsCount: teamsCount,
        playersCount: playersCount,
        matchesPlayed: matchesPlayed,
        matchesPending: matchesPending,
        totalGoals: totalGoals,
        totalYellowCards: totalYellowCards,
        totalRedCards: totalRedCards,
        matchesThisMonth: matchesThisMonth,
        goalsThisMonth: goalsThisMonth,
        resultDistribution: ResultDistribution(
          homeWins: homeWins,
          draws: draws,
          awayWins: awayWins,
        ),
        monthlyMatches: monthlyMatches,
        upcomingMatches: upcomingMatches,
        topScorer: topScorer,
      ));
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al cargar estadísticas: ${e.toString()}'));
    }
  }
}

class _PlayerGoalAgg {
  final String name;
  final String teamName;
  int goals;
  _PlayerGoalAgg(this.name, this.teamName, this.goals);
}
