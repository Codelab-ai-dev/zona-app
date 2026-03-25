import 'package:equatable/equatable.dart';
import '../../../domain/entities/player_match_history_entity.dart';
import '../../../domain/entities/player_stats_entity.dart';  // Also exports SuspensionInfo

/// Player Stats States
abstract class PlayerStatsState extends Equatable {
  const PlayerStatsState();

  @override
  List<Object?> get props => [];
}

/// Initial state
class PlayerStatsInitial extends PlayerStatsState {
  const PlayerStatsInitial();
}

/// Loading state
class PlayerStatsLoading extends PlayerStatsState {
  const PlayerStatsLoading();
}

/// Team stats loaded
class TeamStatsLoaded extends PlayerStatsState {
  final List<PlayerStatsEntity> stats;

  const TeamStatsLoaded(this.stats);

  @override
  List<Object?> get props => [stats];
}

/// Top scorers loaded
class TopScorersLoaded extends PlayerStatsState {
  final List<PlayerStatsEntity> scorers;

  const TopScorersLoaded(this.scorers);

  @override
  List<Object?> get props => [scorers];
}

/// Discipline table loaded
class DisciplineLoaded extends PlayerStatsState {
  final List<PlayerStatsEntity> players;
  final Map<String, SuspensionInfo> suspensions;

  const DisciplineLoaded(this.players, {this.suspensions = const {}});

  @override
  List<Object?> get props => [players, suspensions];
}

/// Single player stats loaded (nullable — player may have no stats)
class PlayerStatsByIdLoaded extends PlayerStatsState {
  final PlayerStatsEntity? stats;

  const PlayerStatsByIdLoaded(this.stats);

  @override
  List<Object?> get props => [stats];
}

/// Player match history loaded (with optional aggregated stats)
class PlayerMatchHistoryLoaded extends PlayerStatsState {
  final List<PlayerMatchHistoryEntry> history;
  final PlayerStatsEntity? aggregated;

  const PlayerMatchHistoryLoaded(this.history, {this.aggregated});

  @override
  List<Object?> get props => [history, aggregated];
}

/// Extemporaneous goals saved successfully
class ExtemporaneousGoalsSaved extends PlayerStatsState {
  const ExtemporaneousGoalsSaved();
}

/// Extemporaneous goals deleted successfully
class ExtemporaneousGoalsDeleted extends PlayerStatsState {
  const ExtemporaneousGoalsDeleted();
}

/// Error state
class PlayerStatsError extends PlayerStatsState {
  final String message;

  const PlayerStatsError(this.message);

  @override
  List<Object?> get props => [message];
}
