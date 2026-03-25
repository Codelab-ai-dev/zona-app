import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_match_history_entity.dart';
import '../entities/player_stats_entity.dart';  // Also exports SuspensionInfo

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

  /// Get active suspensions for a league
  Future<Either<Failure, Map<String, SuspensionInfo>>> getActiveSuspensionsByLeague(
    String leagueId,
  );

  /// Add extemporaneous goals (upserts the match_id=NULL record)
  Future<Either<Failure, void>> addExtemporaneousGoals(
    String playerId,
    int goals,
    int assists,
  );

  /// Update extemporaneous goals by setting new totals (computes diff)
  Future<Either<Failure, void>> updateExtemporaneousGoals(
    String playerId,
    int newTotalGoals,
    int newTotalAssists,
  );

  /// Delete the extemporaneous record for a player
  Future<Either<Failure, void>> deleteExtemporaneousGoals(String playerId);

  /// Get aggregated stats for a single player
  /// Optionally filter by tournament
  Future<Either<Failure, PlayerStatsEntity?>> getStatsByPlayer(
    String playerId, {
    String? tournamentId,
  });

  /// Get player stats for a specific match, split by team
  /// Returns a map with keys 'home' and 'away', each containing a list of PlayerStatsEntity
  Future<Either<Failure, Map<String, List<PlayerStatsEntity>>>> getPlayerStatsByMatch(
    String matchId, {
    required String homeTeamId,
    required String awayTeamId,
  });

  /// Save per-player stats for a match (upsert: insert or update)
  /// Each entry maps to a player_stats row with the given match_id
  Future<Either<Failure, void>> saveMatchPlayerStats({
    required String matchId,
    required List<PlayerMatchStatEntry> entries,
  });

  /// Get match-by-match history for a player (only rows with a match_id)
  Future<Either<Failure, List<PlayerMatchHistoryEntry>>> getMatchHistoryByPlayer(
    String playerId,
  );
}

/// Data class for a single player's stats in a match
class PlayerMatchStatEntry {
  final String playerId;
  final int goals;
  final int assists;
  final int yellowCards;
  final int redCards;
  final int minutesPlayed;

  const PlayerMatchStatEntry({
    required this.playerId,
    this.goals = 0,
    this.assists = 0,
    this.yellowCards = 0,
    this.redCards = 0,
    this.minutesPlayed = 0,
  });

  bool get hasAnyStats =>
      goals > 0 || assists > 0 || yellowCards > 0 || redCards > 0 || minutesPlayed > 0;
}
