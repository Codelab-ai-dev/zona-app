import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/coaching_staff_entity.dart';
import '../repositories/coaching_staff_repository.dart';

class UpdateStaffUseCase {
  final CoachingStaffRepository repository;

  UpdateStaffUseCase(this.repository);

  Future<Either<Failure, CoachingStaffEntity>> call(
      UpdateStaffParams params) {
    return repository.updateStaff(
      staffId: params.staffId,
      name: params.name,
      role: params.role,
      photo: params.photo,
      birthDate: params.birthDate,
      cedula: params.cedula,
      isActive: params.isActive,
    );
  }
}

class UpdateStaffParams extends Equatable {
  final String staffId;
  final String? name;
  final String? role;
  final String? photo;
  final DateTime? birthDate;
  final String? cedula;
  final bool? isActive;

  const UpdateStaffParams({
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
