import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../repositories/player_repository.dart';

class DeletePlayerUseCase {
  final PlayerRepository repository;

  DeletePlayerUseCase(this.repository);

  Future<Either<Failure, void>> call(
    DeletePlayerParams params,
  ) async {
    if (params.playerId.isEmpty) {
      return Left(ValidationFailure('ID del jugador es requerido'));
    }

    return await repository.deletePlayer(params.playerId);
  }
}

class DeletePlayerParams {
  final String playerId;

  const DeletePlayerParams({required this.playerId});
}
