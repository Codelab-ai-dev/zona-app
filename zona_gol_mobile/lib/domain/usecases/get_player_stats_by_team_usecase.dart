import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_stats_entity.dart';
import '../repositories/player_stats_repository.dart';

class GetPlayerStatsByTeamUseCase {
  final PlayerStatsRepository repository;

  GetPlayerStatsByTeamUseCase(this.repository);

  Future<Either<Failure, List<PlayerStatsEntity>>> call(
    GetPlayerStatsByTeamParams params,
  ) async {
    if (params.teamId.isEmpty) {
      return Left(ValidationFailure('ID del equipo es requerido'));
    }

    return await repository.getStatsByTeam(
      params.teamId,
      tournamentId: params.tournamentId,
    );
  }
}

class GetPlayerStatsByTeamParams {
  final String teamId;
  final String? tournamentId;

  const GetPlayerStatsByTeamParams({
    required this.teamId,
    this.tournamentId,
  });
}
