import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/team_standing_entity.dart';
import '../repositories/team_repository.dart';

/// Get Standings by Tournament Use Case
class GetStandingsByTournamentUseCase {
  final TeamRepository repository;

  GetStandingsByTournamentUseCase(this.repository);

  Future<Either<Failure, List<TeamStandingEntity>>> call(
    GetStandingsParams params,
  ) async {
    if (params.tournamentId.isEmpty) {
      return const Left(ValidationFailure('ID del torneo es requerido'));
    }

    return await repository.getStandingsByTournament(params.tournamentId);
  }
}

/// Parameters for GetStandingsByTournamentUseCase
class GetStandingsParams extends Equatable {
  final String tournamentId;

  const GetStandingsParams({required this.tournamentId});

  @override
  List<Object?> get props => [tournamentId];
}
