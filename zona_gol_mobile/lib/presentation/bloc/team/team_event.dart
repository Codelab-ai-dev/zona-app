import 'package:equatable/equatable.dart';

/// Team Events
abstract class TeamEvent extends Equatable {
  const TeamEvent();

  @override
  List<Object?> get props => [];
}

/// Load Teams By League
class LoadTeamsByLeagueEvent extends TeamEvent {
  final String leagueId;
  final bool onlyActive;

  const LoadTeamsByLeagueEvent({
    required this.leagueId,
    this.onlyActive = false,
  });

  @override
  List<Object?> get props => [leagueId, onlyActive];
}

/// Load Teams By Tournament
class LoadTeamsByTournamentEvent extends TeamEvent {
  final String tournamentId;
  final bool onlyActive;

  const LoadTeamsByTournamentEvent({
    required this.tournamentId,
    this.onlyActive = false,
  });

  @override
  List<Object?> get props => [tournamentId, onlyActive];
}

/// Load Team By ID
class LoadTeamByIdEvent extends TeamEvent {
  final String teamId;

  const LoadTeamByIdEvent({required this.teamId});

  @override
  List<Object?> get props => [teamId];
}

/// Reset Team State
class ResetTeamEvent extends TeamEvent {
  const ResetTeamEvent();
}

/// Load Standings By Tournament
class LoadStandingsByTournamentEvent extends TeamEvent {
  final String tournamentId;

  const LoadStandingsByTournamentEvent({required this.tournamentId});

  @override
  List<Object?> get props => [tournamentId];
}

/// Create Team and its owner account.
///
/// When the team was created but the owner failed ([TeamOwnerCreationFailed]),
/// send it again with [existingTeamId] to retry only the owner.
class CreateTeamWithOwnerEvent extends TeamEvent {
  final String teamName;
  final String teamSlug;
  final String leagueId;
  final String? tournamentId;
  final String? logo;
  final String? description;
  final String ownerEmail;
  final String ownerName;
  final String? existingTeamId;

  const CreateTeamWithOwnerEvent({
    required this.teamName,
    required this.teamSlug,
    required this.leagueId,
    this.tournamentId,
    this.logo,
    this.description,
    required this.ownerEmail,
    required this.ownerName,
    this.existingTeamId,
  });

  @override
  List<Object?> get props =>
      [teamName, teamSlug, leagueId, tournamentId, logo, description, ownerEmail, ownerName, existingTeamId];
}

/// Create Team without an owner account (the league admin owns it).
class CreateTeamEvent extends TeamEvent {
  final String name;
  final String slug;
  final String leagueId;
  final String? tournamentId;
  final String? logo;
  final String? description;

  const CreateTeamEvent({
    required this.name,
    required this.slug,
    required this.leagueId,
    this.tournamentId,
    this.logo,
    this.description,
  });

  @override
  List<Object?> get props => [name, slug, leagueId, tournamentId, logo, description];
}

/// Update Team
class UpdateTeamEvent extends TeamEvent {
  final String teamId;
  final String? name;
  final String? slug;
  final String? tournamentId;
  final String? logo;
  final String? description;
  final bool? isActive;

  const UpdateTeamEvent({
    required this.teamId,
    this.name,
    this.slug,
    this.tournamentId,
    this.logo,
    this.description,
    this.isActive,
  });

  @override
  List<Object?> get props => [teamId, name, slug, tournamentId, logo, description, isActive];
}

/// Delete Team
class DeleteTeamEvent extends TeamEvent {
  final String teamId;

  const DeleteTeamEvent({required this.teamId});

  @override
  List<Object?> get props => [teamId];
}

/// Update Standings
class UpdateStandingsEvent extends TeamEvent {
  final String teamId;
  final String tournamentId;
  final int matchesPlayed;
  final int matchesWon;
  final int matchesDrawn;
  final int matchesLost;
  final int goalsFor;
  final int goalsAgainst;
  final int? pointsAdjustment;
  final String? adjustmentReason;

  const UpdateStandingsEvent({
    required this.teamId,
    required this.tournamentId,
    required this.matchesPlayed,
    required this.matchesWon,
    required this.matchesDrawn,
    required this.matchesLost,
    required this.goalsFor,
    required this.goalsAgainst,
    this.pointsAdjustment,
    this.adjustmentReason,
  });

  @override
  List<Object?> get props => [
        teamId, tournamentId,
        matchesPlayed, matchesWon, matchesDrawn, matchesLost,
        goalsFor, goalsAgainst, pointsAdjustment, adjustmentReason,
      ];
}
