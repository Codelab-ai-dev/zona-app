import 'package:equatable/equatable.dart';

import '../../../domain/entities/match_entity.dart';

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

/// Save the result (score, goals, cards, observations) of a match
class SubmitMatchResultEvent extends MatchDetailEvent {
  final MatchEntity match;
  final MatchResultInput result;

  const SubmitMatchResultEvent({required this.match, required this.result});

  @override
  List<Object?> get props => [match, result];
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

/// Publish or hide the match for the public
class ToggleMatchPublishedEvent extends MatchDetailEvent {
  final String matchId;
  final bool isPublished;

  const ToggleMatchPublishedEvent({
    required this.matchId,
    required this.isPublished,
  });

  @override
  List<Object?> get props => [matchId, isPublished];
}
