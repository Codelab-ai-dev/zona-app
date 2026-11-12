import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/team_entity.dart';
import '../entities/team_standing_entity.dart';
import '../usecases/create_team_owner_usecase.dart';

/// Team Repository
/// Defines the contract for team data operations
abstract class TeamRepository {
  /// Get a team by ID
  Future<Either<Failure, TeamEntity>> getTeamById(String teamId);

  /// Get teams by league ID
  Future<Either<Failure, List<TeamEntity>>> getTeamsByLeagueId(
    String leagueId, {
    bool onlyActive = false,
  });

  /// Get teams by tournament ID. [leagueId] saves a lookup of the tournament.
  Future<Either<Failure, List<TeamEntity>>> getTeamsByTournamentId(
    String tournamentId, {
    bool onlyActive = false,
    String? leagueId,
  });

  /// Teams owned by the signed-in user (team owners).
  Future<Either<Failure, List<TeamEntity>>> getMyTeams();

  /// Create a new team. The caller (league admin) owns it until an owner
  /// account is created for it (see [createTeamOwner]).
  Future<Either<Failure, TeamEntity>> createTeam({
    required String name,
    required String slug,
    required String leagueId,
    String? tournamentId,
    String? logo,
    String? description,
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
  });

  /// Delete a team permanently (players, staff and matches included).
  Future<Either<Failure, void>> deleteTeam(String teamId);

  /// Assign team to tournament and group (null group = no group).
  Future<Either<Failure, TeamEntity>> assignToTournament(
    String teamId,
    String tournamentId, {
    String? groupName,
  });

  /// Get team standings by tournament ID
  Future<Either<Failure, List<TeamStandingEntity>>> getStandingsByTournament(
    String tournamentId,
  );

  /// Create the owner account of an existing team (it becomes its owner).
  Future<Either<Failure, CreateTeamOwnerResult>> createTeamOwner({
    required String email,
    required String name,
    required String leagueId,
    required String teamId,
  });

  /// Set a team's displayed totals in a tournament (the difference with the
  /// match data is stored as adjustments) and its points adjustment.
  Future<Either<Failure, void>> updateStandings({
    required String teamId,
    required String tournamentId,
    required int matchesPlayed,
    required int matchesWon,
    required int matchesDrawn,
    required int matchesLost,
    required int goalsFor,
    required int goalsAgainst,
    int? pointsAdjustment,
    String? adjustmentReason,
  });
}
