import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_entity.dart';
import '../repositories/player_repository.dart';

class GetPlayerByIdUseCase {
  final PlayerRepository repository;

  GetPlayerByIdUseCase(this.repository);

  Future<Either<Failure, PlayerEntity>> call(
    GetPlayerByIdParams params,
  ) async {
    if (params.playerId.isEmpty) {
      return Left(ValidationFailure('ID del jugador es requerido'));
    }

    return await repository.getPlayerById(params.playerId);
  }
}

class GetPlayerByIdParams {
  final String playerId;

  const GetPlayerByIdParams({required this.playerId});
}
