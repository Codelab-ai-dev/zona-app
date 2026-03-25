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
      return Left(ValidationFailure('Tournament ID cannot be empty'));
    }

    return await repository.getStandingsByTournament(params.tournamentId);
  }
}

/// Get Standings by League Use Case
class GetStandingsByLeagueUseCase {
  final TeamRepository repository;

  GetStandingsByLeagueUseCase(this.repository);

  Future<Either<Failure, List<TeamStandingEntity>>> call(
    GetStandingsByLeagueParams params,
  ) async {
    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('League ID cannot be empty'));
    }

    return await repository.getStandingsByLeague(params.leagueId);
  }
}

/// Parameters for GetStandingsByTournamentUseCase
class GetStandingsParams extends Equatable {
  final String tournamentId;

  const GetStandingsParams({required this.tournamentId});

  @override
  List<Object?> get props => [tournamentId];
}

/// Parameters for GetStandingsByLeagueUseCase
class GetStandingsByLeagueParams extends Equatable {
  final String leagueId;

  const GetStandingsByLeagueParams({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}
