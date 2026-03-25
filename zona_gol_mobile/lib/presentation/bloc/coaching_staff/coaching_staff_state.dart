import 'package:equatable/equatable.dart';
import '../../../domain/entities/coaching_staff_entity.dart';

abstract class CoachingStaffState extends Equatable {
  const CoachingStaffState();

  @override
  List<Object?> get props => [];
}

class CoachingStaffInitial extends CoachingStaffState {
  const CoachingStaffInitial();
}

class CoachingStaffLoading extends CoachingStaffState {
  const CoachingStaffLoading();
}

class CoachingStaffLoaded extends CoachingStaffState {
  final List<CoachingStaffEntity> staff;

  const CoachingStaffLoaded(this.staff);

  int get activeCount => staff.where((s) => s.isActive).length;
  int get totalCount => staff.length;

  @override
  List<Object?> get props => [staff];
}

class CoachingStaffCreated extends CoachingStaffState {
  final CoachingStaffEntity member;

  const CoachingStaffCreated(this.member);

  @override
  List<Object?> get props => [member];
}

class CoachingStaffUpdated extends CoachingStaffState {
  final CoachingStaffEntity member;

  const CoachingStaffUpdated(this.member);

  @override
  List<Object?> get props => [member];
}

class CoachingStaffDeleted extends CoachingStaffState {
  final String staffId;

  const CoachingStaffDeleted(this.staffId);

  @override
  List<Object?> get props => [staffId];
}

class CoachingStaffError extends CoachingStaffState {
  final String message;

  const CoachingStaffError(this.message);

  @override
  List<Object?> get props => [message];
}
