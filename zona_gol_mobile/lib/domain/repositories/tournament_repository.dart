import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/tournament_entity.dart';

/// Tournament Repository
/// Defines the contract for tournament data operations
///
/// This interface is implemented in the data layer and used by use cases
/// to interact with tournament data from various sources (API, cache, etc.)
abstract class TournamentRepository {
  /// Get all tournaments
  ///
  /// Returns a list of all tournaments, optionally filtered by active status
  /// If [onlyActive] is true, only active tournaments are returned
  Future<Either<Failure, List<TournamentEntity>>> getAllTournaments({
    bool onlyActive = false,
  });

  /// Get a tournament by ID
  ///
  /// Returns a single tournament matching the provided [tournamentId]
  /// Returns a [Failure] if the tournament is not found
  Future<Either<Failure, TournamentEntity>> getTournamentById(
    String tournamentId,
  );

  /// Get tournaments by league ID
  ///
  /// Returns all tournaments belonging to a specific league
  /// Useful for showing tournaments in league detail screen
  Future<Either<Failure, List<TournamentEntity>>> getTournamentsByLeagueId(
    String leagueId, {
    bool onlyActive = false,
  });

  /// Get active tournaments
  ///
  /// Returns all currently active tournaments (between start and end dates)
  /// Useful for showing ongoing tournaments
  Future<Either<Failure, List<TournamentEntity>>> getActiveTournaments();

  /// Get upcoming tournaments
  ///
  /// Returns tournaments that haven't started yet
  /// Useful for showing upcoming tournaments
  Future<Either<Failure, List<TournamentEntity>>> getUpcomingTournaments();

  /// Create a new tournament
  ///
  /// Creates a new tournament with the provided data
  /// Returns the created tournament entity
  /// Only league_admin and super_admin users should be able to create tournaments
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
  });

  /// Update a tournament
  ///
  /// Updates an existing tournament with the provided data
  /// Returns the updated tournament entity
  /// Only league_admin and super_admin can update
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
  });

  /// Delete a tournament
  ///
  /// Soft deletes a tournament by setting isActive to false
  /// Physical deletion is not recommended due to data integrity
  /// Only super_admin users should be able to delete tournaments
  Future<Either<Failure, void>> deleteTournament(String tournamentId);

  /// Search tournaments
  ///
  /// Search tournaments by name
  /// Returns tournaments matching the search query
  Future<Either<Failure, List<TournamentEntity>>> searchTournaments(
    String query, {
    bool onlyActive = true,
  });

  /// Activate tournament
  ///
  /// Sets a tournament as active (isActive = true)
  /// Only one tournament per league should be active at a time (optional business rule)
  Future<Either<Failure, TournamentEntity>> activateTournament(
    String tournamentId,
  );

  /// Deactivate tournament
  ///
  /// Sets a tournament as inactive (isActive = false)
  Future<Either<Failure, TournamentEntity>> deactivateTournament(
    String tournamentId,
  );
}
