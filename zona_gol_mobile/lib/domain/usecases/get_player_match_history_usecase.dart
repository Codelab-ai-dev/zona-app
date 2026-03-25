import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_match_history_entity.dart';
import '../repositories/player_stats_repository.dart';

class GetPlayerMatchHistoryUseCase {
  final PlayerStatsRepository repository;

  GetPlayerMatchHistoryUseCase(this.repository);

  Future<Either<Failure, List<PlayerMatchHistoryEntry>>> call(
    String playerId,
  ) async {
    if (playerId.isEmpty) {
      return Left(ValidationFailure('ID del jugador es requerido'));
    }

    return await repository.getMatchHistoryByPlayer(playerId);
  }
}
