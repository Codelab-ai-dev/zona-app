import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_stats_entity.dart';
import '../repositories/player_stats_repository.dart';

class GetDisciplineByLeagueUseCase {
  final PlayerStatsRepository repository;

  GetDisciplineByLeagueUseCase(this.repository);

  Future<Either<Failure, List<PlayerStatsEntity>>> call(
    GetDisciplineByLeagueParams params,
  ) async {
    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('ID de la liga es requerido'));
    }

    return await repository.getDisciplineByLeague(
      params.leagueId,
      limit: params.limit,
    );
  }
}

class GetDisciplineByLeagueParams {
  final String leagueId;
  final int limit;

  const GetDisciplineByLeagueParams({
    required this.leagueId,
    this.limit = 20,
  });
}
