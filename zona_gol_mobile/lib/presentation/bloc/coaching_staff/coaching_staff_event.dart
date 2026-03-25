import 'package:equatable/equatable.dart';

abstract class CoachingStaffEvent extends Equatable {
  const CoachingStaffEvent();

  @override
  List<Object?> get props => [];
}

class LoadStaffByTeamEvent extends CoachingStaffEvent {
  final String teamId;
  final bool onlyActive;

  const LoadStaffByTeamEvent({
    required this.teamId,
    this.onlyActive = false,
  });

  @override
  List<Object?> get props => [teamId, onlyActive];
}

class CreateStaffEvent extends CoachingStaffEvent {
  final String name;
  final String teamId;
  final String role;
  final String? photo;
  final DateTime? birthDate;
  final String? cedula;

  const CreateStaffEvent({
    required this.name,
    required this.teamId,
    required this.role,
    this.photo,
    this.birthDate,
    this.cedula,
  });

  @override
  List<Object?> get props => [name, teamId, role, photo, birthDate, cedula];
}

class UpdateStaffEvent extends CoachingStaffEvent {
  final String staffId;
  final String? name;
  final String? role;
  final String? photo;
  final DateTime? birthDate;
  final String? cedula;
  final bool? isActive;

  const UpdateStaffEvent({
    required this.staffId,
    this.name,
    this.role,
    this.photo,
    this.birthDate,
    this.cedula,
    this.isActive,
  });

  @override
  List<Object?> get props =>
      [staffId, name, role, photo, birthDate, cedula, isActive];
}

class DeleteStaffEvent extends CoachingStaffEvent {
  final String staffId;

  const DeleteStaffEvent({required this.staffId});

  @override
  List<Object?> get props => [staffId];
}
