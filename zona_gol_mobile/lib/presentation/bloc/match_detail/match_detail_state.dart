import 'package:equatable/equatable.dart';

import '../../../domain/entities/match_entity.dart';

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
  final String? refereeObservations;

  const MatchDetailLoaded({
    required this.match,
    this.refereeObservations,
  });

  @override
  List<Object?> get props => [match, refereeObservations];
}

class MatchDetailError extends MatchDetailState {
  final String message;

  const MatchDetailError(this.message);

  @override
  List<Object?> get props => [message];
}

class MatchResultSaving extends MatchDetailState {
  const MatchResultSaving();
}

class MatchResultSaved extends MatchDetailState {
  const MatchResultSaved();
}

class MatchResultError extends MatchDetailState {
  final String message;

  const MatchResultError(this.message);

  @override
  List<Object?> get props => [message];
}

/// A status change or publication toggle is in progress
class MatchActionInProgress extends MatchDetailState {
  const MatchActionInProgress();
}

class MatchActionSuccess extends MatchDetailState {
  final String message;

  const MatchActionSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class MatchActionError extends MatchDetailState {
  final String message;

  const MatchActionError(this.message);

  @override
  List<Object?> get props => [message];
}
