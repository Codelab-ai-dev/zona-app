import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/player_stats_entity.dart';
import '../repositories/player_stats_repository.dart';

class GetTopScorersByLeagueUseCase {
  final PlayerStatsRepository repository;

  GetTopScorersByLeagueUseCase(this.repository);

  Future<Either<Failure, List<PlayerStatsEntity>>> call(
    GetTopScorersByLeagueParams params,
  ) async {
    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('ID de la liga es requerido'));
    }

    return await repository.getTopScorersByLeague(
      params.leagueId,
      limit: params.limit,
    );
  }
}

class GetTopScorersByLeagueParams {
  final String leagueId;
  final int limit;

  const GetTopScorersByLeagueParams({
    required this.leagueId,
    this.limit = 20,
  });
}
