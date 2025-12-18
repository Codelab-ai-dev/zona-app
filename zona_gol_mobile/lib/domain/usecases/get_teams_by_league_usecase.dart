import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/team_entity.dart';
import '../repositories/team_repository.dart';

/// Get Teams By League Use Case
/// Essential for displaying teams in LeagueDetailScreen
class GetTeamsByLeagueUseCase {
  final TeamRepository repository;

  GetTeamsByLeagueUseCase(this.repository);

  Future<Either<Failure, List<TeamEntity>>> call(
    GetTeamsByLeagueParams params,
  ) async {
    // Validate league ID
    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('ID de la liga es requerido'));
    }

    return await repository.getTeamsByLeagueId(
      params.leagueId,
      onlyActive: params.onlyActive,
    );
  }
}

class GetTeamsByLeagueParams {
  final String leagueId;
  final bool onlyActive;

  const GetTeamsByLeagueParams({
    required this.leagueId,
    this.onlyActive = false,
  });
}
