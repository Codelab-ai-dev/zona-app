import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../repositories/coaching_staff_repository.dart';

class DeleteStaffUseCase {
  final CoachingStaffRepository repository;

  DeleteStaffUseCase(this.repository);

  Future<Either<Failure, void>> call(DeleteStaffParams params) {
    return repository.deleteStaff(params.staffId);
  }
}

class DeleteStaffParams extends Equatable {
  final String staffId;

  const DeleteStaffParams({required this.staffId});

  @override
  List<Object?> get props => [staffId];
}
