import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/league_entity.dart';
import '../entities/league_stats_entity.dart';

/// League Repository
/// Defines the contract for league data operations
abstract class LeagueRepository {
  /// Get leagues.
  ///
  /// [onlyActive] true lists the public active leagues; false lists every
  /// league, active or not (super admin only).
  Future<Either<Failure, List<LeagueEntity>>> getAllLeagues({
    bool onlyActive = false,
  });

  /// Get a league by ID
  Future<Either<Failure, LeagueEntity>> getLeagueById(String leagueId);

  /// Create a new league administered by [adminId] (super admin only).
  /// [productMode] can be 'full' or 'web_only'.
  Future<Either<Failure, LeagueEntity>> createLeague({
    required String name,
    required String slug,
    required String description,
    required String adminId,
    String? logo,
    String productMode = 'full',
  });

  /// Update a league. [isActive] activates or deactivates it.
  Future<Either<Failure, LeagueEntity>> updateLeague({
    required String leagueId,
    String? name,
    String? slug,
    String? description,
    String? logo,
    bool? isActive,
  });

  /// Permanently delete a league with its tournaments, teams, players and
  /// matches (super admin only).
  Future<Either<Failure, void>> deleteLeague(String leagueId);

  /// Get league statistics
  Future<Either<Failure, LeagueStatsEntity>> getLeagueStats(String leagueId);

  /// Platform-wide statistics (super admin only).
  Future<Either<Failure, GlobalStatsEntity>> getGlobalStats();
}
