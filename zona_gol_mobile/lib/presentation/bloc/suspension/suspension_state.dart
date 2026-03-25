import 'package:equatable/equatable.dart';
import '../../../domain/entities/suspension_entity.dart';

abstract class SuspensionState extends Equatable {
  const SuspensionState();

  @override
  List<Object?> get props => [];
}

class SuspensionInitial extends SuspensionState {}

class SuspensionLoading extends SuspensionState {}

class SuspensionLoaded extends SuspensionState {
  final List<SuspensionEntity> suspensions;

  const SuspensionLoaded({required this.suspensions});

  int get activeCount =>
      suspensions.where((s) => s.status == SuspensionStatus.active).length;

  int get completedCount =>
      suspensions.where((s) => s.status == SuspensionStatus.completed).length;

  int get cancelledCount =>
      suspensions.where((s) => s.status == SuspensionStatus.cancelled).length;

  @override
  List<Object?> get props => [suspensions];
}

class SuspensionError extends SuspensionState {
  final String message;

  const SuspensionError({required this.message});

  @override
  List<Object?> get props => [message];
}

class SuspensionActionSuccess extends SuspensionState {
  final String message;

  const SuspensionActionSuccess({required this.message});

  @override
  List<Object?> get props => [message];
}

class SuspensionActionError extends SuspensionState {
  final String message;

  const SuspensionActionError({required this.message});

  @override
  List<Object?> get props => [message];
}
