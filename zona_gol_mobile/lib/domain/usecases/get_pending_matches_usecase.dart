import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/match_entity.dart';
import '../repositories/match_repository.dart';

/// Get Pending Matches Use Case
/// Fetches all pending matches (scheduled/in_progress) for a league
class GetPendingMatchesUseCase {
  final MatchRepository repository;

  GetPendingMatchesUseCase(this.repository);

  Future<Either<Failure, List<MatchEntity>>> call(
    GetPendingMatchesParams params,
  ) async {
    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('League ID cannot be empty'));
    }

    return await repository.getPendingMatchesByLeague(params.leagueId);
  }
}

/// Parameters for GetPendingMatchesUseCase
class GetPendingMatchesParams extends Equatable {
  final String leagueId;

  const GetPendingMatchesParams({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}
