import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/team_entity.dart';
import '../entities/team_standing_entity.dart';
import '../usecases/create_team_owner_usecase.dart';

/// Team Repository
/// Defines the contract for team data operations
abstract class TeamRepository {
  /// Get all teams
  Future<Either<Failure, List<TeamEntity>>> getAllTeams({
    bool onlyActive = false,
  });

  /// Get a team by ID
  Future<Either<Failure, TeamEntity>> getTeamById(String teamId);

  /// Get teams by league ID
  Future<Either<Failure, List<TeamEntity>>> getTeamsByLeagueId(
    String leagueId, {
    bool onlyActive = false,
  });

  /// Get teams by tournament ID
  Future<Either<Failure, List<TeamEntity>>> getTeamsByTournamentId(
    String tournamentId, {
    bool onlyActive = false,
  });

  /// Get teams by owner ID
  Future<Either<Failure, List<TeamEntity>>> getTeamsByOwnerId(
    String ownerId, {
    bool onlyActive = false,
  });

  /// Get teams by group (for group_knockout tournaments)
  Future<Either<Failure, List<TeamEntity>>> getTeamsByGroup(
    String tournamentId,
    String groupName,
  );

  /// Create a new team
  Future<Either<Failure, TeamEntity>> createTeam({
    required String name,
    required String slug,
    required String leagueId,
    required String ownerId,
    String? tournamentId,
    String? logo,
    String? description,
    String? homePrimaryColor,
    String? homeSecondaryColor,
    String? homeAccentColor,
    String? awayPrimaryColor,
    String? awaySecondaryColor,
    String? awayAccentColor,
    String? groupName,
  });

  /// Update a team
  Future<Either<Failure, TeamEntity>> updateTeam({
    required String teamId,
    String? name,
    String? slug,
    String? tournamentId,
    String? logo,
    String? description,
    bool? isActive,
    String? homePrimaryColor,
    String? homeSecondaryColor,
    String? homeAccentColor,
    String? awayPrimaryColor,
    String? awaySecondaryColor,
    String? awayAccentColor,
    String? groupName,
  });

  /// Delete a team (soft delete)
  Future<Either<Failure, void>> deleteTeam(String teamId);

  /// Search teams by name
  Future<Either<Failure, List<TeamEntity>>> searchTeams(
    String query, {
    bool onlyActive = true,
  });

  /// Check if a slug is available for a league
  Future<Either<Failure, bool>> isSlugAvailable(
    String slug,
    String leagueId, {
    String? excludeTeamId,
  });

  /// Assign team to tournament
  Future<Either<Failure, TeamEntity>> assignToTournament(
    String teamId,
    String tournamentId, {
    String? groupName,
  });

  /// Remove team from tournament
  Future<Either<Failure, TeamEntity>> removeFromTournament(String teamId);

  /// Get team standings by tournament ID
  Future<Either<Failure, List<TeamStandingEntity>>> getStandingsByTournament(
    String tournamentId,
  );

  /// Get team standings by league ID
  Future<Either<Failure, List<TeamStandingEntity>>> getStandingsByLeague(
    String leagueId,
  );

  /// Create a team owner account via Edge Function
  Future<Either<Failure, CreateTeamOwnerResult>> createTeamOwner({
    required String email,
    required String name,
    required String leagueId,
  });

  /// Update team standings (upsert to team_stats)
  Future<Either<Failure, void>> updateStandings({
    required String teamId,
    required String tournamentId,
    required String leagueId,
    int? matchesPlayed,
    int? matchesWon,
    int? matchesDrawn,
    int? matchesLost,
    int? goalsFor,
    int? goalsAgainst,
    int? pointsAdjustment,
    String? adjustmentReason,
  });
}
