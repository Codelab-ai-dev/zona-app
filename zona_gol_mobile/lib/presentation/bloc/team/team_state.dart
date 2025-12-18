import 'package:equatable/equatable.dart';
import '../../../domain/entities/team_entity.dart';

/// Team States
/// Represents different states of team data loading
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
/// Used when loading teams by league or tournament
class TeamsLoaded extends TeamState {
  final List<TeamEntity> teams;

  const TeamsLoaded(this.teams);

  @override
  List<Object?> get props => [teams];
}

/// Single Team Loaded State
/// Used when loading a specific team by ID
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
