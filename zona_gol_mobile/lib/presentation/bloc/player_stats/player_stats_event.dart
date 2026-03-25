import 'package:equatable/equatable.dart';

/// Player Stats Events
abstract class PlayerStatsEvent extends Equatable {
  const PlayerStatsEvent();

  @override
  List<Object?> get props => [];
}

/// Load stats for a team's players
class LoadTeamStatsEvent extends PlayerStatsEvent {
  final String teamId;
  final String? tournamentId;

  const LoadTeamStatsEvent({
    required this.teamId,
    this.tournamentId,
  });

  @override
  List<Object?> get props => [teamId, tournamentId];
}

/// Load top scorers for a league
class LoadTopScorersEvent extends PlayerStatsEvent {
  final String leagueId;
  final int limit;

  const LoadTopScorersEvent({
    required this.leagueId,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [leagueId, limit];
}

/// Load discipline table for a league
class LoadDisciplineEvent extends PlayerStatsEvent {
  final String leagueId;
  final int limit;

  const LoadDisciplineEvent({
    required this.leagueId,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [leagueId, limit];
}

/// Reset player stats state
class ResetPlayerStatsEvent extends PlayerStatsEvent {
  const ResetPlayerStatsEvent();
}

/// Add extemporaneous goals for a player
class AddExtemporaneousGoalsEvent extends PlayerStatsEvent {
  final String playerId;
  final String leagueId;
  final int goals;
  final int assists;

  const AddExtemporaneousGoalsEvent({
    required this.playerId,
    required this.leagueId,
    required this.goals,
    required this.assists,
  });

  @override
  List<Object?> get props => [playerId, leagueId, goals, assists];
}

/// Update extemporaneous goals (edit totals)
class UpdateExtemporaneousGoalsEvent extends PlayerStatsEvent {
  final String playerId;
  final String leagueId;
  final int newTotalGoals;
  final int newTotalAssists;

  const UpdateExtemporaneousGoalsEvent({
    required this.playerId,
    required this.leagueId,
    required this.newTotalGoals,
    required this.newTotalAssists,
  });

  @override
  List<Object?> get props => [playerId, leagueId, newTotalGoals, newTotalAssists];
}

/// Load stats for a single player by ID
class LoadPlayerStatsByIdEvent extends PlayerStatsEvent {
  final String playerId;
  final String? tournamentId;

  const LoadPlayerStatsByIdEvent({
    required this.playerId,
    this.tournamentId,
  });

  @override
  List<Object?> get props => [playerId, tournamentId];
}

/// Load match-by-match history + aggregated stats for a player
class LoadPlayerMatchHistoryEvent extends PlayerStatsEvent {
  final String playerId;

  const LoadPlayerMatchHistoryEvent({required this.playerId});

  @override
  List<Object?> get props => [playerId];
}

/// Delete extemporaneous goals for a player
class DeleteExtemporaneousGoalsEvent extends PlayerStatsEvent {
  final String playerId;
  final String leagueId;

  const DeleteExtemporaneousGoalsEvent({
    required this.playerId,
    required this.leagueId,
  });

  @override
  List<Object?> get props => [playerId, leagueId];
}
