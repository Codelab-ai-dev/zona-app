import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/failure_mapper.dart';
import '../../domain/entities/player_match_history_entity.dart';
import '../../domain/entities/player_stats_entity.dart';
import '../../domain/repositories/player_stats_repository.dart';
import '../mappers/player_stats_mapper.dart';

/// Player stats backed by the Zona Gol API. The server aggregates match
/// events and manual stats; this class only reads and maps.
class PlayerStatsRepositoryImpl implements PlayerStatsRepository {
  final ApiClient api;

  PlayerStatsRepositoryImpl({required this.api});

  @override
  Future<Either<Failure, List<PlayerStatsEntity>>> getStatsByTeam(
    String teamId, {
    String? tournamentId,
  }) async {
    try {
      // Not paginated: the endpoint returns the whole active roster.
      final rows = await api.getList('/teams/$teamId/player-stats', query: {'tournament_id': tournamentId});
      return Right(rows.map((r) => PlayerStatsMapper.fromJson(r, teamId: teamId)).toList());
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener estadísticas'));
    }
  }

  @override
  Future<Either<Failure, List<PlayerStatsEntity>>> getTopScorersByLeague(
    String leagueId, {
    int limit = 20,
  }) =>
      _leagueTotals(leagueId, 'top-scorers', limit, 'Error al obtener goleadores');

  @override
  Future<Either<Failure, List<PlayerStatsEntity>>> getDisciplineByLeague(
    String leagueId, {
    int limit = 20,
  }) =>
      _leagueTotals(leagueId, 'discipline', limit, 'Error al obtener disciplina');

  Future<Either<Failure, List<PlayerStatsEntity>>> _leagueTotals(
    String leagueId,
    String ranking,
    int limit,
    String fallback,
  ) async {
    try {
      final rows = await api.getList('/leagues/$leagueId/$ranking', limit: limit.clamp(1, 100));
      return Right(rows.map(PlayerStatsMapper.fromJson).toList());
    } catch (e) {
      return Left(failureFrom(e, fallback));
    }
  }

  @override
  Future<Either<Failure, Map<String, SuspensionInfo>>> getActiveSuspensionsByLeague(
    String leagueId,
  ) async {
    try {
      // Not paginated server-side: one request returns every suspension.
      final rows = await api.getList('/leagues/$leagueId/suspensions');
      final suspensions = <String, SuspensionInfo>{};
      for (final row in rows) {
        if (row['status'] != 'active') continue;
        final info = PlayerStatsMapper.suspensionFromJson(row);
        if (info.isActive) suspensions[info.playerId] = info;
      }
      return Right(suspensions);
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener suspensiones'));
    }
  }

  @override
  Future<Either<Failure, List<ManualStatsEntity>>> getManualStats(
    String tournamentId,
  ) async {
    try {
      final rows = await api.getList('/tournaments/$tournamentId/manual-stats');
      return Right(rows.map(PlayerStatsMapper.manualFromJson).toList());
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener estadísticas manuales'));
    }
  }

  @override
  Future<Either<Failure, void>> setManualStats(
    String tournamentId,
    ManualStatsEntity stats,
  ) async {
    try {
      await api.put(
        '/tournaments/$tournamentId/players/${stats.playerId}/manual-stats',
        PlayerStatsMapper.manualToJson(stats),
      );
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'Error al guardar goles'));
    }
  }

  @override
  Future<Either<Failure, PlayerStatsEntity?>> getStatsByPlayer(String playerId) async {
    try {
      final stats = PlayerStatsMapper.fromJson(await api.getObject('/players/$playerId/stats'));
      final empty = stats.matchesPlayed == 0 &&
          stats.goals == 0 &&
          stats.assists == 0 &&
          stats.yellowCards == 0 &&
          stats.redCards == 0;
      return Right(empty ? null : stats);
    } on ApiException catch (e) {
      if (e.isNotFound) return const Right(null);
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener estadísticas del jugador'));
    }
  }

  @override
  Future<Either<Failure, List<PlayerMatchHistoryEntry>>> getMatchHistoryByPlayer(
    String playerId,
  ) async {
    try {
      final rows = await api.getAll('/players/$playerId/matches');
      final history = rows.map(PlayerStatsMapper.historyFromJson).toList()
        ..sort((a, b) => b.matchDate.compareTo(a.matchDate));
      return Right(history);
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener historial'));
    }
  }
}
