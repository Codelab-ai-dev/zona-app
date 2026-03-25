import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/league_stats_entity.dart';
import '../repositories/league_repository.dart';

class GetLeagueStatsUseCase {
  final LeagueRepository repository;

  GetLeagueStatsUseCase(this.repository);

  Future<Either<Failure, LeagueStatsEntity>> call(String leagueId) async {
    if (leagueId.isEmpty) {
      return Left(ValidationFailure('League ID cannot be empty'));
    }
    return await repository.getLeagueStats(leagueId);
  }
}
