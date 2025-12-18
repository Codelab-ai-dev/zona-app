import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/team_entity.dart';
import '../repositories/team_repository.dart';

/// Get Team By ID Use Case
class GetTeamByIdUseCase {
  final TeamRepository repository;

  GetTeamByIdUseCase(this.repository);

  Future<Either<Failure, TeamEntity>> call(GetTeamParams params) async {
    // Validate team ID
    if (params.teamId.isEmpty) {
      return Left(ValidationFailure('ID del equipo es requerido'));
    }

    return await repository.getTeamById(params.teamId);
  }
}

class GetTeamParams {
  final String teamId;

  const GetTeamParams({required this.teamId});
}
