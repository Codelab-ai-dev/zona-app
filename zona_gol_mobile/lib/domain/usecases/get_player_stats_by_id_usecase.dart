import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_stats_entity.dart';
import '../repositories/player_stats_repository.dart';

class GetPlayerStatsByIdUseCase {
  final PlayerStatsRepository repository;

  GetPlayerStatsByIdUseCase(this.repository);

  Future<Either<Failure, PlayerStatsEntity?>> call(
    GetPlayerStatsByIdParams params,
  ) async {
    if (params.playerId.isEmpty) {
      return Left(ValidationFailure('ID del jugador es requerido'));
    }

    return await repository.getStatsByPlayer(
      params.playerId,
      tournamentId: params.tournamentId,
    );
  }
}

class GetPlayerStatsByIdParams {
  final String playerId;
  final String? tournamentId;

  const GetPlayerStatsByIdParams({
    required this.playerId,
    this.tournamentId,
  });
}
