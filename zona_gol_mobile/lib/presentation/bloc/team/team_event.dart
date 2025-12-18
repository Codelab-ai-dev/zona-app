import 'package:equatable/equatable.dart';

/// Team Events
/// Essential events for Team management in the app
abstract class TeamEvent extends Equatable {
  const TeamEvent();

  @override
  List<Object?> get props => [];
}

/// Load Teams By League
/// Used in LeagueDetailScreen to show teams in "Equipos" tab
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
/// Used in TournamentDetailScreen to show teams
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
/// Used in TeamDetailScreen
class LoadTeamByIdEvent extends TeamEvent {
  final String teamId;

  const LoadTeamByIdEvent({required this.teamId});

  @override
  List<Object?> get props => [teamId];
}

/// Reset Team State
/// Used to clear state when navigating away
class ResetTeamEvent extends TeamEvent {
  const ResetTeamEvent();
}
