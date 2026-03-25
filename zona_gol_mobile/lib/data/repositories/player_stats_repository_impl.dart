import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/player_match_history_entity.dart';
import '../../domain/entities/player_stats_entity.dart';
import '../../domain/repositories/player_stats_repository.dart';
import '../datasources/remote/supabase_client.dart';

/// Player Stats Repository Implementation
/// Uses server-side RPC functions for aggregation when available,
/// falls back to client-side aggregation otherwise.
class PlayerStatsRepositoryImpl implements PlayerStatsRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  PlayerStatsRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  /// Check if a PostgrestException means the RPC function doesn't exist
  bool _isRpcNotFound(PostgrestException e) {
    final msg = e.message.toLowerCase();
    return e.code == '42883' ||
        msg.contains('could not find the function') ||
        msg.contains('does not exist');
  }

  /// Parse a row from the RPC response into a PlayerStatsEntity
  PlayerStatsEntity _rpcRowToEntity(Map<String, dynamic> row) {
    return PlayerStatsEntity(
      playerId: row['player_id'] as String,
      playerName: row['player_name'] as String? ?? '',
      jerseyNumber: row['jersey_number'] as int?,
      position: row['position'] as String?,
      photo: row['photo'] as String?,
      teamId: row['team_id'] as String? ?? '',
      teamName: row['team_name'] as String?,
      matchesPlayed: (row['matches_played'] as num?)?.toInt() ?? 0,
      goals: (row['goals'] as num?)?.toInt() ?? 0,
      assists: (row['assists'] as num?)?.toInt() ?? 0,
      yellowCards: (row['yellow_cards'] as num?)?.toInt() ?? 0,
      redCards: (row['red_cards'] as num?)?.toInt() ?? 0,
      minutesPlayed: (row['minutes_played'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  Future<Either<Failure, List<PlayerStatsEntity>>> getStatsByTeam(
    String teamId, {
    String? tournamentId,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Try RPC first (single server-side aggregated query)
      final params = <String, dynamic>{'p_team_id': teamId};
      if (tournamentId != null) {
        params['p_tournament_id'] = tournamentId;
      }

      final response = await supabaseService.client
          .rpc('get_stats_by_team', params: params);

      final rows = response as List;
      final stats = rows
          .map((r) => _rpcRowToEntity(r as Map<String, dynamic>))
          .toList();

      return Right(stats);
    } on PostgrestException catch (e) {
      // If RPC doesn't exist yet, fall back to client-side aggregation
      if (_isRpcNotFound(e)) {
        return _getStatsByTeamFallback(teamId, tournamentId: tournamentId);
      }
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener estadísticas: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<PlayerStatsEntity>>> getTopScorersByLeague(
    String leagueId, {
    int limit = 20,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Single RPC call — server does JOIN + GROUP BY + ORDER + LIMIT
      final response = await supabaseService.client.rpc(
        'get_top_scorers_by_league',
        params: {'p_league_id': leagueId, 'p_limit': limit},
      );

      final rows = response as List;
      final stats = rows
          .map((r) => _rpcRowToEntity(r as Map<String, dynamic>))
          .toList();

      return Right(stats);
    } on PostgrestException catch (e) {
      // If RPC doesn't exist yet, fall back to client-side aggregation
      if (_isRpcNotFound(e)) {
        return _getTopScorersByLeagueFallback(leagueId, limit: limit);
      }
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener goleadores: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<PlayerStatsEntity>>> getDisciplineByLeague(
    String leagueId, {
    int limit = 20,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Single RPC call — server does JOIN + GROUP BY + ORDER + LIMIT
      final response = await supabaseService.client.rpc(
        'get_discipline_by_league',
        params: {'p_league_id': leagueId, 'p_limit': limit},
      );

      final rows = response as List;
      final stats = rows
          .map((r) => _rpcRowToEntity(r as Map<String, dynamic>))
          .toList();

      return Right(stats);
    } on PostgrestException catch (e) {
      // If RPC doesn't exist yet, fall back to client-side aggregation
      if (_isRpcNotFound(e)) {
        return _getDisciplineByLeagueFallback(leagueId, limit: limit);
      }
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener disciplina: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, PlayerStatsEntity?>> getStatsByPlayer(
    String playerId, {
    String? tournamentId,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      var query = supabaseService.client
          .from('player_stats')
          .select('''
            id, player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played,
            players!inner(id, name, jersey_number, position, photo, team_id,
              teams(id, name))
          ''')
          .eq('player_id', playerId);

      final response = await query;
      final rows = response as List;

      if (rows.isEmpty) return const Right(null);

      final stats = _aggregateByPlayer(rows);
      return Right(stats.isNotEmpty ? stats.first : null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener estadísticas del jugador: ${e.toString()}'));
    }
  }

  // ==================== Fallback methods (client-side aggregation) ====================

  Future<Either<Failure, List<PlayerStatsEntity>>> _getStatsByTeamFallback(
    String teamId, {
    String? tournamentId,
  }) async {
    try {
      var query = supabaseService.client
          .from('player_stats')
          .select('''
            id, player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played,
            players!inner(id, name, jersey_number, position, photo, team_id)
          ''')
          .eq('players.team_id', teamId);

      if (tournamentId != null) {
        query = query.eq('matches.tournament_id', tournamentId);
      }

      final response = await query;
      return Right(_aggregateByPlayer(response as List));
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener estadísticas: ${e.toString()}'));
    }
  }

  Future<Either<Failure, List<PlayerStatsEntity>>> _getTopScorersByLeagueFallback(
    String leagueId, {
    int limit = 20,
  }) async {
    try {
      final teamsResponse = await supabaseService.client
          .from('teams')
          .select('id')
          .eq('league_id', leagueId)
          .eq('is_active', true);

      final teamIds = (teamsResponse as List)
          .map((t) => t['id'] as String)
          .toList();

      if (teamIds.isEmpty) return const Right([]);

      final response = await supabaseService.client
          .from('player_stats')
          .select('''
            id, player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played,
            players!inner(id, name, jersey_number, position, photo, team_id,
              teams(id, name))
          ''')
          .inFilter('players.team_id', teamIds);

      final stats = _aggregateByPlayer(response as List);
      stats.sort((a, b) {
        final goalDiff = b.goals.compareTo(a.goals);
        if (goalDiff != 0) return goalDiff;
        return b.assists.compareTo(a.assists);
      });

      return Right(stats.take(limit).toList());
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener goleadores: ${e.toString()}'));
    }
  }

  Future<Either<Failure, List<PlayerStatsEntity>>> _getDisciplineByLeagueFallback(
    String leagueId, {
    int limit = 20,
  }) async {
    try {
      final teamsResponse = await supabaseService.client
          .from('teams')
          .select('id')
          .eq('league_id', leagueId)
          .eq('is_active', true);

      final teamIds = (teamsResponse as List)
          .map((t) => t['id'] as String)
          .toList();

      if (teamIds.isEmpty) return const Right([]);

      final response = await supabaseService.client
          .from('player_stats')
          .select('''
            id, player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played,
            players!inner(id, name, jersey_number, position, photo, team_id,
              teams(id, name))
          ''')
          .inFilter('players.team_id', teamIds);

      final stats = _aggregateByPlayer(response as List);
      stats.sort((a, b) {
        final disciplineDiff = b.disciplineScore.compareTo(a.disciplineScore);
        if (disciplineDiff != 0) return disciplineDiff;
        return b.yellowCards.compareTo(a.yellowCards);
      });

      final withCards = stats.where((s) => s.disciplineScore > 0).toList();
      return Right(withCards.take(limit).toList());
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener disciplina: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, Map<String, SuspensionInfo>>> getActiveSuspensionsByLeague(
    String leagueId,
  ) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('player_suspensions')
          .select('player_id, reason, matches_to_serve, matches_served')
          .eq('league_id', leagueId)
          .eq('status', 'active');

      final rows = response as List;
      final Map<String, SuspensionInfo> suspensions = {};

      for (final row in rows) {
        final data = row as Map<String, dynamic>;
        final playerId = data['player_id'] as String;
        final info = SuspensionInfo(
          playerId: playerId,
          reason: data['reason'] as String?,
          matchesToServe: (data['matches_to_serve'] as int?) ?? 0,
          matchesServed: (data['matches_served'] as int?) ?? 0,
        );
        // Only include if still has matches remaining
        if (info.matchesRemaining > 0) {
          suspensions[playerId] = info;
        }
      }

      return Right(suspensions);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener suspensiones: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> addExtemporaneousGoals(
    String playerId,
    int goals,
    int assists,
  ) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Check if extemporaneous record already exists (match_id IS NULL)
      final existing = await supabaseService.client
          .from('player_stats')
          .select('id, goals, assists')
          .eq('player_id', playerId)
          .isFilter('match_id', null);

      final rows = existing as List;

      if (rows.isNotEmpty) {
        // Update existing record by adding to current values
        final record = rows.first as Map<String, dynamic>;
        final currentGoals = (record['goals'] as int?) ?? 0;
        final currentAssists = (record['assists'] as int?) ?? 0;
        await supabaseService.client
            .from('player_stats')
            .update({
              'goals': currentGoals + goals,
              'assists': currentAssists + assists,
            })
            .eq('id', record['id'] as String);
      } else {
        // Insert new extemporaneous record
        await supabaseService.client.from('player_stats').insert({
          'player_id': playerId,
          'match_id': null,
          'goals': goals,
          'assists': assists,
          'yellow_cards': 0,
          'red_cards': 0,
          'minutes_played': 0,
        });
      }

      return const Right(null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al agregar goles: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> updateExtemporaneousGoals(
    String playerId,
    int newTotalGoals,
    int newTotalAssists,
  ) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Fetch ALL records for this player to compute current totals
      final allRecords = await supabaseService.client
          .from('player_stats')
          .select('id, match_id, goals, assists')
          .eq('player_id', playerId);

      final rows = allRecords as List;

      int matchGoals = 0;
      int matchAssists = 0;
      String? extemporaneousId;

      for (final row in rows) {
        final data = row as Map<String, dynamic>;
        if (data['match_id'] == null) {
          extemporaneousId = data['id'] as String;
        } else {
          matchGoals += (data['goals'] as int?) ?? 0;
          matchAssists += (data['assists'] as int?) ?? 0;
        }
      }

      // Compute what the extemporaneous record should be
      final diffGoals = newTotalGoals - matchGoals;
      final diffAssists = newTotalAssists - matchAssists;

      if (diffGoals <= 0 && diffAssists <= 0) {
        // No extemporaneous needed — delete if exists
        if (extemporaneousId != null) {
          await supabaseService.client
              .from('player_stats')
              .delete()
              .eq('id', extemporaneousId);
        }
      } else if (extemporaneousId != null) {
        // Update existing extemporaneous record
        await supabaseService.client
            .from('player_stats')
            .update({
              'goals': diffGoals < 0 ? 0 : diffGoals,
              'assists': diffAssists < 0 ? 0 : diffAssists,
            })
            .eq('id', extemporaneousId);
      } else {
        // Create new extemporaneous record
        await supabaseService.client.from('player_stats').insert({
          'player_id': playerId,
          'match_id': null,
          'goals': diffGoals < 0 ? 0 : diffGoals,
          'assists': diffAssists < 0 ? 0 : diffAssists,
          'yellow_cards': 0,
          'red_cards': 0,
          'minutes_played': 0,
        });
      }

      return const Right(null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al actualizar goles: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteExtemporaneousGoals(
    String playerId,
  ) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      await supabaseService.client
          .from('player_stats')
          .delete()
          .eq('player_id', playerId)
          .isFilter('match_id', null);

      return const Right(null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al eliminar goles: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, Map<String, List<PlayerStatsEntity>>>> getPlayerStatsByMatch(
    String matchId, {
    required String homeTeamId,
    required String awayTeamId,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('player_stats')
          .select('''
            id, player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played,
            players!inner(id, name, jersey_number, position, photo, team_id)
          ''')
          .eq('match_id', matchId);

      final rows = response as List;

      final List<PlayerStatsEntity> homeStats = [];
      final List<PlayerStatsEntity> awayStats = [];

      for (final row in rows) {
        final data = row as Map<String, dynamic>;
        final player = data['players'] as Map<String, dynamic>?;
        if (player == null) continue;

        final teamId = player['team_id'] as String? ?? '';

        final entity = PlayerStatsEntity(
          playerId: data['player_id'] as String,
          playerName: player['name'] as String? ?? '',
          jerseyNumber: player['jersey_number'] as int?,
          position: player['position'] as String?,
          photo: player['photo'] as String?,
          teamId: teamId,
          matchesPlayed: 1,
          goals: (data['goals'] as num?)?.toInt() ?? 0,
          assists: (data['assists'] as num?)?.toInt() ?? 0,
          yellowCards: (data['yellow_cards'] as num?)?.toInt() ?? 0,
          redCards: (data['red_cards'] as num?)?.toInt() ?? 0,
          minutesPlayed: (data['minutes_played'] as num?)?.toInt() ?? 0,
        );

        if (teamId == homeTeamId) {
          homeStats.add(entity);
        } else if (teamId == awayTeamId) {
          awayStats.add(entity);
        }
      }

      // Sort by jersey number
      homeStats.sort((a, b) => (a.jerseyNumber ?? 999).compareTo(b.jerseyNumber ?? 999));
      awayStats.sort((a, b) => (a.jerseyNumber ?? 999).compareTo(b.jerseyNumber ?? 999));

      return Right({'home': homeStats, 'away': awayStats});
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener estadísticas del partido: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> saveMatchPlayerStats({
    required String matchId,
    required List<PlayerMatchStatEntry> entries,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Filter to only players with stats
      final withStats = entries.where((e) => e.hasAnyStats).toList();

      if (withStats.isEmpty) {
        // Delete any existing stats for this match
        await supabaseService.client
            .from('player_stats')
            .delete()
            .eq('match_id', matchId);
        return const Right(null);
      }

      // Get existing records for this match to determine insert vs update
      final existing = await supabaseService.client
          .from('player_stats')
          .select('id, player_id')
          .eq('match_id', matchId);

      final existingMap = <String, String>{};
      for (final row in existing as List) {
        final data = row as Map<String, dynamic>;
        existingMap[data['player_id'] as String] = data['id'] as String;
      }

      // Determine which player IDs are being submitted
      final submittedPlayerIds = withStats.map((e) => e.playerId).toSet();

      // Delete records for players not in the submission
      final toDelete = existingMap.entries
          .where((e) => !submittedPlayerIds.contains(e.key))
          .map((e) => e.value)
          .toList();

      if (toDelete.isNotEmpty) {
        await supabaseService.client
            .from('player_stats')
            .delete()
            .inFilter('id', toDelete);
      }

      // Upsert records for submitted players
      final upsertData = withStats.map((entry) {
        final data = <String, dynamic>{
          'player_id': entry.playerId,
          'match_id': matchId,
          'goals': entry.goals,
          'assists': entry.assists,
          'yellow_cards': entry.yellowCards,
          'red_cards': entry.redCards,
          'minutes_played': entry.minutesPlayed,
        };
        // Include id if updating an existing record
        if (existingMap.containsKey(entry.playerId)) {
          data['id'] = existingMap[entry.playerId];
        }
        return data;
      }).toList();

      await supabaseService.client
          .from('player_stats')
          .upsert(upsertData, onConflict: 'id');

      return const Right(null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al guardar estadísticas: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<PlayerMatchHistoryEntry>>> getMatchHistoryByPlayer(
    String playerId,
  ) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Get the player's team_id first
      final playerResp = await supabaseService.client
          .from('players')
          .select('team_id')
          .eq('id', playerId)
          .maybeSingle();

      if (playerResp == null) return const Right([]);
      final playerTeamId = playerResp['team_id'] as String;

      // Get per-match stats rows (only those with a match_id)
      final response = await supabaseService.client
          .from('player_stats')
          .select('''
            goals, assists, yellow_cards, red_cards, minutes_played,
            matches!inner(
              id, match_date, home_score, away_score,
              home_team:teams!matches_home_team_id_fkey(id, name),
              away_team:teams!matches_away_team_id_fkey(id, name)
            )
          ''')
          .eq('player_id', playerId)
          .not('match_id', 'is', null)
          .order('match_id', ascending: false);

      final rows = response as List;
      final List<PlayerMatchHistoryEntry> history = [];

      for (final row in rows) {
        final data = row as Map<String, dynamic>;
        final match = data['matches'] as Map<String, dynamic>?;
        if (match == null) continue;

        final homeTeam = match['home_team'] as Map<String, dynamic>?;
        final awayTeam = match['away_team'] as Map<String, dynamic>?;
        if (homeTeam == null || awayTeam == null) continue;

        final homeTeamId = homeTeam['id'] as String;
        final isHome = homeTeamId == playerTeamId;
        final opponentName = isHome
            ? (awayTeam['name'] as String? ?? '')
            : (homeTeam['name'] as String? ?? '');

        DateTime? matchDate;
        final dateStr = match['match_date'] as String?;
        if (dateStr != null) {
          matchDate = DateTime.tryParse(dateStr);
        }

        history.add(PlayerMatchHistoryEntry(
          matchId: match['id'] as String,
          matchDate: matchDate ?? DateTime(2000),
          opponentName: opponentName,
          isHome: isHome,
          homeScore: (match['home_score'] as num?)?.toInt() ?? 0,
          awayScore: (match['away_score'] as num?)?.toInt() ?? 0,
          goals: (data['goals'] as num?)?.toInt() ?? 0,
          assists: (data['assists'] as num?)?.toInt() ?? 0,
          yellowCards: (data['yellow_cards'] as num?)?.toInt() ?? 0,
          redCards: (data['red_cards'] as num?)?.toInt() ?? 0,
          minutesPlayed: (data['minutes_played'] as num?)?.toInt() ?? 0,
        ));
      }

      // Sort by date descending
      history.sort((a, b) => b.matchDate.compareTo(a.matchDate));

      return Right(history);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Error al obtener historial: ${e.toString()}'));
    }
  }

  /// Aggregate per-match records into per-player stats
  List<PlayerStatsEntity> _aggregateByPlayer(List<dynamic> rows) {
    final Map<String, _PlayerAccumulator> accumulators = {};

    for (final row in rows) {
      final data = row as Map<String, dynamic>;
      final playerId = data['player_id'] as String;
      final player = data['players'] as Map<String, dynamic>?;

      if (player == null) continue;

      if (!accumulators.containsKey(playerId)) {
        final team = player['teams'] as Map<String, dynamic>?;
        accumulators[playerId] = _PlayerAccumulator(
          playerId: playerId,
          playerName: player['name'] as String? ?? '',
          jerseyNumber: player['jersey_number'] as int?,
          position: player['position'] as String?,
          photo: player['photo'] as String?,
          teamId: player['team_id'] as String? ?? '',
          teamName: team?['name'] as String?,
        );
      }

      final acc = accumulators[playerId]!;
      acc.matchesPlayed++;
      acc.goals += (data['goals'] as int?) ?? 0;
      acc.assists += (data['assists'] as int?) ?? 0;
      acc.yellowCards += (data['yellow_cards'] as int?) ?? 0;
      acc.redCards += (data['red_cards'] as int?) ?? 0;
      acc.minutesPlayed += (data['minutes_played'] as int?) ?? 0;
    }

    return accumulators.values.map((acc) => acc.toEntity()).toList();
  }
}

/// Internal accumulator for aggregating per-match records
class _PlayerAccumulator {
  final String playerId;
  final String playerName;
  final int? jerseyNumber;
  final String? position;
  final String? photo;
  final String teamId;
  final String? teamName;
  int matchesPlayed = 0;
  int goals = 0;
  int assists = 0;
  int yellowCards = 0;
  int redCards = 0;
  int minutesPlayed = 0;

  _PlayerAccumulator({
    required this.playerId,
    required this.playerName,
    this.jerseyNumber,
    this.position,
    this.photo,
    required this.teamId,
    this.teamName,
  });

  PlayerStatsEntity toEntity() => PlayerStatsEntity(
        playerId: playerId,
        playerName: playerName,
        jerseyNumber: jerseyNumber,
        position: position,
        photo: photo,
        teamId: teamId,
        teamName: teamName,
        matchesPlayed: matchesPlayed,
        goals: goals,
        assists: assists,
        yellowCards: yellowCards,
        redCards: redCards,
        minutesPlayed: minutesPlayed,
      );
}
