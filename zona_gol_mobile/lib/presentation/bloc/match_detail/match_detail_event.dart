import 'package:equatable/equatable.dart';

import '../../../domain/entities/match_entity.dart';
import '../../../domain/repositories/player_stats_repository.dart';

abstract class MatchDetailEvent extends Equatable {
  const MatchDetailEvent();

  @override
  List<Object?> get props => [];
}

class LoadMatchDetailEvent extends MatchDetailEvent {
  final String matchId;

  const LoadMatchDetailEvent({required this.matchId});

  @override
  List<Object?> get props => [matchId];
}

class RefreshMatchDetailEvent extends MatchDetailEvent {
  final String matchId;

  const RefreshMatchDetailEvent({required this.matchId});

  @override
  List<Object?> get props => [matchId];
}

class SaveMatchPlayerStatsEvent extends MatchDetailEvent {
  final String matchId;
  final int homeScore;
  final int awayScore;
  final List<PlayerMatchStatEntry> homeEntries;
  final List<PlayerMatchStatEntry> awayEntries;
  final String? observations;

  const SaveMatchPlayerStatsEvent({
    required this.matchId,
    required this.homeScore,
    required this.awayScore,
    required this.homeEntries,
    required this.awayEntries,
    this.observations,
  });

  @override
  List<Object?> get props =>
      [matchId, homeScore, awayScore, homeEntries, awayEntries, observations];
}

class UpdateMatchStatusEvent extends MatchDetailEvent {
  final String matchId;
  final MatchStatus status;

  const UpdateMatchStatusEvent({
    required this.matchId,
    required this.status,
  });

  @override
  List<Object?> get props => [matchId, status];
}
