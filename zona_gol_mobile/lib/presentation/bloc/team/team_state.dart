import 'package:equatable/equatable.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/team_standing_entity.dart';

/// Team States
abstract class TeamState extends Equatable {
  const TeamState();

  @override
  List<Object?> get props => [];
}

/// Initial State
class TeamInitial extends TeamState {
  const TeamInitial();
}

/// Loading State
class TeamLoading extends TeamState {
  const TeamLoading();
}

/// Teams Loaded State (List of Teams)
class TeamsLoaded extends TeamState {
  final List<TeamEntity> teams;

  const TeamsLoaded(this.teams);

  @override
  List<Object?> get props => [teams];
}

/// Single Team Loaded State
class TeamDetailLoaded extends TeamState {
  final TeamEntity team;

  const TeamDetailLoaded(this.team);

  @override
  List<Object?> get props => [team];
}

/// Error State
class TeamError extends TeamState {
  final String message;

  const TeamError(this.message);

  @override
  List<Object?> get props => [message];
}

/// Standings Loaded State
class StandingsLoaded extends TeamState {
  final List<TeamStandingEntity> standings;
  final String? tournamentId;

  const StandingsLoaded(this.standings, {this.tournamentId});

  @override
  List<Object?> get props => [standings, tournamentId];
}

/// Team Created State
class TeamCreated extends TeamState {
  final TeamEntity team;

  const TeamCreated(this.team);

  @override
  List<Object?> get props => [team];
}

/// Team Created With Owner State (includes credentials)
class TeamCreatedWithOwner extends TeamState {
  final TeamEntity team;
  final String ownerEmail;
  final String ownerPassword;

  const TeamCreatedWithOwner({
    required this.team,
    required this.ownerEmail,
    required this.ownerPassword,
  });

  @override
  List<Object?> get props => [team, ownerEmail, ownerPassword];
}

/// Team Updated State
class TeamUpdated extends TeamState {
  final TeamEntity team;

  const TeamUpdated(this.team);

  @override
  List<Object?> get props => [team];
}

/// Team Deleted State
class TeamDeleted extends TeamState {
  final String teamId;

  const TeamDeleted(this.teamId);

  @override
  List<Object?> get props => [teamId];
}

/// Standings Updated State
class StandingsUpdated extends TeamState {
  const StandingsUpdated();
}
