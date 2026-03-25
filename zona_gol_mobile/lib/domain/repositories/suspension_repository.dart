import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/suspension_entity.dart';

/// Suspension Repository
/// Defines the contract for player suspension operations
abstract class SuspensionRepository {
  /// Get all suspensions for a league (all statuses)
  Future<Either<Failure, List<SuspensionEntity>>> getSuspensionsByLeague(
    String leagueId,
  );

  /// Create a new suspension
  Future<Either<Failure, SuspensionEntity>> createSuspension({
    required String playerId,
    required String teamId,
    required String leagueId,
    required String suspensionType,
    String? reason,
    required int matchesToServe,
  });

  /// Cancel an active suspension
  Future<Either<Failure, void>> cancelSuspension(String suspensionId);

  /// Complete a suspension (set matches_served = matches_to_serve)
  Future<Either<Failure, void>> completeSuspension(String suspensionId);

  /// Update suspension matches_to_serve
  Future<Either<Failure, void>> updateSuspension(
    String suspensionId, {
    required int matchesToServe,
  });

  /// Clear all suspensions for a league
  Future<Either<Failure, void>> clearAllSuspensions(String leagueId);

  /// Get all active players in a league (for player selector in create dialog)
  /// Returns list of maps with: id, name, jersey_number, team_id, team_name
  Future<Either<Failure, List<Map<String, dynamic>>>> getLeaguePlayers(
    String leagueId,
  );
}
