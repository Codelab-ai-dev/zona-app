import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/coaching_staff_entity.dart';
import '../repositories/coaching_staff_repository.dart';

class CreateStaffUseCase {
  final CoachingStaffRepository repository;

  CreateStaffUseCase(this.repository);

  Future<Either<Failure, CoachingStaffEntity>> call(
      CreateStaffParams params) {
    return repository.createStaff(
      name: params.name,
      teamId: params.teamId,
      role: params.role,
      photo: params.photo,
      birthDate: params.birthDate,
      cedula: params.cedula,
    );
  }
}

class CreateStaffParams extends Equatable {
  final String name;
  final String teamId;
  final String role;
  final String? photo;
  final DateTime? birthDate;
  final String? cedula;

  const CreateStaffParams({
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
