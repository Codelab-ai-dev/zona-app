import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/match_entity.dart';

/// Match Repository Interface
/// Defines the contract for match data operations
abstract class MatchRepository {
  /// Get all pending matches for a league (scheduled or in_progress)
  Future<Either<Failure, List<MatchEntity>>> getPendingMatchesByLeague(
    String leagueId,
  );

  /// Get all matches for a tournament
  Future<Either<Failure, List<MatchEntity>>> getMatchesByTournament(
    String tournamentId,
  );

  /// Get a single match by ID
  Future<Either<Failure, MatchEntity>> getMatchById(String matchId);

  /// Update match result (score and status)
  Future<Either<Failure, MatchEntity>> updateMatchResult({
    required String matchId,
    required int homeScore,
    required int awayScore,
  });

  /// Update match status
  Future<Either<Failure, MatchEntity>> updateMatchStatus({
    required String matchId,
    required MatchStatus status,
  });

  /// Batch insert matches (for fixture generation)
  Future<Either<Failure, List<MatchEntity>>> createMatches(
    List<Map<String, dynamic>> matches,
  );

  /// Get existing match pairs for a tournament (lightweight, no joins)
  Future<Either<Failure, List<Map<String, dynamic>>>> getExistingMatchPairs(
    String tournamentId,
  );

  /// Update match details (teams, date, time, field) for manual editing
  Future<Either<Failure, MatchEntity>> updateMatchDetails({
    required String matchId,
    required Map<String, dynamic> data,
  });

  /// Delete matches by IDs
  Future<Either<Failure, void>> deleteMatches(List<String> matchIds);

  /// Save referee report (observations) for a match
  Future<Either<Failure, void>> saveRefereeReport(
    String matchId,
    String observations,
  );

  /// Get referee report (observations) for a match
  Future<Either<Failure, String?>> getRefereeReport(String matchId);
}
