import 'package:equatable/equatable.dart';
import '../../../domain/entities/league_entity.dart';

/// League States
/// Represents the different states of league data
abstract class LeagueState extends Equatable {
  const LeagueState();

  @override
  List<Object?> get props => [];
}

/// Initial State
/// The initial state before any data is loaded
class LeagueInitial extends LeagueState {
  const LeagueInitial();
}

/// Loading State
/// Indicates that league data is being fetched
class LeagueLoading extends LeagueState {
  const LeagueLoading();
}

/// Leagues Loaded State
/// Successfully loaded a list of leagues
class LeaguesLoaded extends LeagueState {
  final List<LeagueEntity> leagues;

  const LeaguesLoaded(this.leagues);

  @override
  List<Object?> get props => [leagues];
}

/// League Detail Loaded State
/// Successfully loaded a single league
class LeagueDetailLoaded extends LeagueState {
  final LeagueEntity league;

  const LeagueDetailLoaded(this.league);

  @override
  List<Object?> get props => [league];
}

/// League Created State
/// Successfully created a new league
class LeagueCreated extends LeagueState {
  final LeagueEntity league;

  const LeagueCreated(this.league);

  @override
  List<Object?> get props => [league];
}

/// League Error State
/// An error occurred while processing league data
class LeagueError extends LeagueState {
  final String message;

  const LeagueError(this.message);

  @override
  List<Object?> get props => [message];
}

/// League Updated State
/// Successfully updated a league
class LeagueUpdated extends LeagueState {
  final LeagueEntity league;

  const LeagueUpdated(this.league);

  @override
  List<Object?> get props => [league];
}

/// League Deleted State
/// Successfully deleted a league
class LeagueDeleted extends LeagueState {
  final String leagueId;

  const LeagueDeleted(this.leagueId);

  @override
  List<Object?> get props => [leagueId];
}

/// League Status Toggled State
/// Successfully toggled the active status of a league
class LeagueStatusToggled extends LeagueState {
  final LeagueEntity league;

  const LeagueStatusToggled(this.league);

  @override
  List<Object?> get props => [league];
}
