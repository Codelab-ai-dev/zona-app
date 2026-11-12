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

/// Add extemporaneous goals for a player in a tournament (adds to the
/// manual goals and assists already recorded there)
class AddExtemporaneousGoalsEvent extends PlayerStatsEvent {
  final String playerId;
  final String leagueId;
  final String tournamentId;
  final int goals;
  final int assists;

  const AddExtemporaneousGoalsEvent({
    required this.playerId,
    required this.leagueId,
    required this.tournamentId,
    required this.goals,
    required this.assists,
  });

  @override
  List<Object?> get props => [playerId, leagueId, tournamentId, goals, assists];
}

/// Set a player's extemporaneous goals and assists in a tournament
/// (absolute values; match goals are not affected)
class UpdateExtemporaneousGoalsEvent extends PlayerStatsEvent {
  final String playerId;
  final String leagueId;
  final String tournamentId;
  final int goals;
  final int assists;

  const UpdateExtemporaneousGoalsEvent({
    required this.playerId,
    required this.leagueId,
    required this.tournamentId,
    required this.goals,
    required this.assists,
  });

  @override
  List<Object?> get props => [playerId, leagueId, tournamentId, goals, assists];
}

/// Load stats for a single player by ID
class LoadPlayerStatsByIdEvent extends PlayerStatsEvent {
  final String playerId;

  const LoadPlayerStatsByIdEvent({required this.playerId});

  @override
  List<Object?> get props => [playerId];
}

/// Load match-by-match history + aggregated stats for a player
class LoadPlayerMatchHistoryEvent extends PlayerStatsEvent {
  final String playerId;

  const LoadPlayerMatchHistoryEvent({required this.playerId});

  @override
  List<Object?> get props => [playerId];
}

/// Delete a player's extemporaneous goals and assists in a tournament
class DeleteExtemporaneousGoalsEvent extends PlayerStatsEvent {
  final String playerId;
  final String leagueId;
  final String tournamentId;

  const DeleteExtemporaneousGoalsEvent({
    required this.playerId,
    required this.leagueId,
    required this.tournamentId,
  });

  @override
  List<Object?> get props => [playerId, leagueId, tournamentId];
}
