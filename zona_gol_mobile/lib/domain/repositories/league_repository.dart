import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/league_entity.dart';

/// League Repository
/// Defines the contract for league data operations
///
/// This interface is implemented in the data layer and used by use cases
/// to interact with league data from various sources (API, cache, etc.)
abstract class LeagueRepository {
  /// Get all leagues
  ///
  /// Returns a list of all leagues, optionally filtered by active status
  /// If [onlyActive] is true, only active leagues are returned
  Future<Either<Failure, List<LeagueEntity>>> getAllLeagues({
    bool onlyActive = false,
  });

  /// Get a league by ID
  ///
  /// Returns a single league matching the provided [leagueId]
  /// Returns a [Failure] if the league is not found
  Future<Either<Failure, LeagueEntity>> getLeagueById(String leagueId);

  /// Get a league by slug
  ///
  /// Returns a single league matching the provided [slug]
  /// Returns a [Failure] if the league is not found
  Future<Either<Failure, LeagueEntity>> getLeagueBySlug(String slug);

  /// Get leagues by admin ID
  ///
  /// Returns all leagues managed by the specified admin
  /// Useful for league admin dashboard to show "my leagues"
  Future<Either<Failure, List<LeagueEntity>>> getLeaguesByAdminId(
    String adminId, {
    bool onlyActive = false,
  });

  /// Create a new league
  ///
  /// Creates a new league with the provided data
  /// Returns the created league entity
  /// Only super_admin users should be able to create leagues
  Future<Either<Failure, LeagueEntity>> createLeague({
    required String name,
    required String slug,
    required String description,
    required String adminId,
    String? logo,
  });

  /// Update a league
  ///
  /// Updates an existing league with the provided data
  /// Returns the updated league entity
  /// Only super_admin and the league admin can update
  Future<Either<Failure, LeagueEntity>> updateLeague({
    required String leagueId,
    String? name,
    String? slug,
    String? description,
    String? adminId,
    String? logo,
    bool? isActive,
  });

  /// Delete a league
  ///
  /// Soft deletes a league by setting isActive to false
  /// Physical deletion is not recommended due to data integrity
  /// Only super_admin users should be able to delete leagues
  Future<Either<Failure, void>> deleteLeague(String leagueId);

  /// Search leagues
  ///
  /// Search leagues by name or description
  /// Returns leagues matching the search query
  Future<Either<Failure, List<LeagueEntity>>> searchLeagues(
    String query, {
    bool onlyActive = true,
  });

  /// Check if a slug is available
  ///
  /// Validates if a slug is not already taken by another league
  /// Useful for creating/updating leagues with unique slugs
  Future<Either<Failure, bool>> isSlugAvailable(
    String slug, {
    String? excludeLeagueId,
  });
}
