import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/coaching_staff_entity.dart';
import '../repositories/coaching_staff_repository.dart';

class GetStaffByTeamUseCase {
  final CoachingStaffRepository repository;

  GetStaffByTeamUseCase(this.repository);

  Future<Either<Failure, List<CoachingStaffEntity>>> call(
      GetStaffByTeamParams params) {
    return repository.getStaffByTeamId(
      params.teamId,
      onlyActive: params.onlyActive,
    );
  }
}

class GetStaffByTeamParams extends Equatable {
  final String teamId;
  final bool onlyActive;

  const GetStaffByTeamParams({
    required this.teamId,
    this.onlyActive = false,
  });

  @override
  List<Object?> get props => [teamId, onlyActive];
}
