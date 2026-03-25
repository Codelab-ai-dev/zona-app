import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_entity.dart';
import '../repositories/player_repository.dart';

class GetPlayersByTeamUseCase {
  final PlayerRepository repository;

  GetPlayersByTeamUseCase(this.repository);

  Future<Either<Failure, List<PlayerEntity>>> call(
    GetPlayersByTeamParams params,
  ) async {
    if (params.teamId.isEmpty) {
      return Left(ValidationFailure('ID del equipo es requerido'));
    }

    return await repository.getPlayersByTeamId(
      params.teamId,
      onlyActive: params.onlyActive,
    );
  }
}

class GetPlayersByTeamParams {
  final String teamId;
  final bool onlyActive;

  const GetPlayersByTeamParams({
    required this.teamId,
    this.onlyActive = false,
  });
}
