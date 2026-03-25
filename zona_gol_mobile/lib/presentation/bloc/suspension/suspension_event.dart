import 'package:equatable/equatable.dart';

abstract class SuspensionEvent extends Equatable {
  const SuspensionEvent();

  @override
  List<Object?> get props => [];
}

class LoadSuspensionsEvent extends SuspensionEvent {
  final String leagueId;

  const LoadSuspensionsEvent({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}

class CreateSuspensionEvent extends SuspensionEvent {
  final String playerId;
  final String teamId;
  final String leagueId;
  final String suspensionType;
  final String? reason;
  final int matchesToServe;

  const CreateSuspensionEvent({
    required this.playerId,
    required this.teamId,
    required this.leagueId,
    required this.suspensionType,
    this.reason,
    required this.matchesToServe,
  });

  @override
  List<Object?> get props =>
      [playerId, teamId, leagueId, suspensionType, reason, matchesToServe];
}

class CancelSuspensionEvent extends SuspensionEvent {
  final String suspensionId;
  final String leagueId;

  const CancelSuspensionEvent({
    required this.suspensionId,
    required this.leagueId,
  });

  @override
  List<Object?> get props => [suspensionId, leagueId];
}

class CompleteSuspensionEvent extends SuspensionEvent {
  final String suspensionId;
  final String leagueId;

  const CompleteSuspensionEvent({
    required this.suspensionId,
    required this.leagueId,
  });

  @override
  List<Object?> get props => [suspensionId, leagueId];
}

class UpdateSuspensionEvent extends SuspensionEvent {
  final String suspensionId;
  final int matchesToServe;
  final String leagueId;

  const UpdateSuspensionEvent({
    required this.suspensionId,
    required this.matchesToServe,
    required this.leagueId,
  });

  @override
  List<Object?> get props => [suspensionId, matchesToServe, leagueId];
}

class ClearAllSuspensionsEvent extends SuspensionEvent {
  final String leagueId;

  const ClearAllSuspensionsEvent({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}
