import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/team_entity.dart';
import '../repositories/team_repository.dart';

/// Get Teams By Tournament Use Case
/// Essential for displaying teams in TournamentDetailScreen
class GetTeamsByTournamentUseCase {
  final TeamRepository repository;

  GetTeamsByTournamentUseCase(this.repository);

  Future<Either<Failure, List<TeamEntity>>> call(
    GetTeamsByTournamentParams params,
  ) async {
    // Validate tournament ID
    if (params.tournamentId.isEmpty) {
      return Left(ValidationFailure('ID del torneo es requerido'));
    }

    return await repository.getTeamsByTournamentId(
      params.tournamentId,
      onlyActive: params.onlyActive,
    );
  }
}

class GetTeamsByTournamentParams {
  final String tournamentId;
  final bool onlyActive;

  const GetTeamsByTournamentParams({
    required this.tournamentId,
    this.onlyActive = false,
  });
}
