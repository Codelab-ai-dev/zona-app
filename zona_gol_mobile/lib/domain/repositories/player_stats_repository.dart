import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_match_history_entity.dart';
import '../entities/player_stats_entity.dart';  // Also exports SuspensionInfo, ManualStatsEntity

/// Player Stats Repository
/// Defines the contract for player statistics operations
abstract class PlayerStatsRepository {
  /// Get aggregated stats for all players in a team
  /// Optionally filter by tournament
  Future<Either<Failure, List<PlayerStatsEntity>>> getStatsByTeam(
    String teamId, {
    String? tournamentId,
  });

  /// Get top scorers across a league (all tournaments)
  Future<Either<Failure, List<PlayerStatsEntity>>> getTopScorersByLeague(
    String leagueId, {
    int limit = 20,
  });

  /// Get discipline table (most carded players) across a league
  Future<Either<Failure, List<PlayerStatsEntity>>> getDisciplineByLeague(
    String leagueId, {
    int limit = 20,
  });

  /// Get active suspensions for a league, keyed by player id
  Future<Either<Failure, Map<String, SuspensionInfo>>> getActiveSuspensionsByLeague(
    String leagueId,
  );

  /// Manual (extemporaneous) stats of every player in a tournament
  Future<Either<Failure, List<ManualStatsEntity>>> getManualStats(
    String tournamentId,
  );

  /// Replaces a player's manual stats in a tournament (absolute values;
  /// all zeros removes them)
  Future<Either<Failure, void>> setManualStats(
    String tournamentId,
    ManualStatsEntity stats,
  );

  /// Get aggregated stats for a single player (null when the player has none)
  Future<Either<Failure, PlayerStatsEntity?>> getStatsByPlayer(String playerId);

  /// Get match-by-match history for a player (finished matches)
  Future<Either<Failure, List<PlayerMatchHistoryEntry>>> getMatchHistoryByPlayer(
    String playerId,
  );
}
