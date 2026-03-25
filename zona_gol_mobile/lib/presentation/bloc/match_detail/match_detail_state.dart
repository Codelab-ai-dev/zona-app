import 'package:equatable/equatable.dart';

import '../../../domain/entities/match_entity.dart';
import '../../../domain/entities/player_stats_entity.dart';

abstract class MatchDetailState extends Equatable {
  const MatchDetailState();

  @override
  List<Object?> get props => [];
}

class MatchDetailInitial extends MatchDetailState {
  const MatchDetailInitial();
}

class MatchDetailLoading extends MatchDetailState {
  const MatchDetailLoading();
}

class MatchDetailLoaded extends MatchDetailState {
  final MatchEntity match;
  final List<PlayerStatsEntity> homePlayerStats;
  final List<PlayerStatsEntity> awayPlayerStats;
  final String? refereeObservations;

  const MatchDetailLoaded({
    required this.match,
    this.homePlayerStats = const [],
    this.awayPlayerStats = const [],
    this.refereeObservations,
  });

  @override
  List<Object?> get props =>
      [match, homePlayerStats, awayPlayerStats, refereeObservations];
}

class MatchDetailError extends MatchDetailState {
  final String message;

  const MatchDetailError(this.message);

  @override
  List<Object?> get props => [message];
}

class MatchPlayerStatsSaving extends MatchDetailState {
  const MatchPlayerStatsSaving();
}

class MatchPlayerStatsSaved extends MatchDetailState {
  const MatchPlayerStatsSaved();
}

class MatchPlayerStatsError extends MatchDetailState {
  final String message;

  const MatchPlayerStatsError(this.message);

  @override
  List<Object?> get props => [message];
}

class MatchStatusUpdating extends MatchDetailState {
  const MatchStatusUpdating();
}

class MatchStatusUpdated extends MatchDetailState {
  final MatchEntity match;

  const MatchStatusUpdated(this.match);

  @override
  List<Object?> get props => [match];
}

class MatchStatusUpdateError extends MatchDetailState {
  final String message;

  const MatchStatusUpdateError(this.message);

  @override
  List<Object?> get props => [message];
}
