import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/match_entity.dart';
import '../repositories/match_repository.dart';

/// Result object containing the match (with its goals and cards) and the
/// referee observations
class MatchDetailResult extends Equatable {
  final MatchEntity match;
  final String? refereeObservations;

  const MatchDetailResult({
    required this.match,
    this.refereeObservations,
  });

  @override
  List<Object?> get props => [match, refereeObservations];
}

/// Get Match Detail Use Case
/// Loads a match with its result events plus the referee observations
class GetMatchDetailUseCase {
  final MatchRepository matchRepository;

  GetMatchDetailUseCase(this.matchRepository);

  Future<Either<Failure, MatchDetailResult>> call(
    GetMatchDetailParams params,
  ) async {
    if (params.matchId.isEmpty) {
      return const Left(ValidationFailure('Partido no válido'));
    }

    final matchResult = await matchRepository.getMatchById(params.matchId);

    return matchResult.fold(
      (failure) => Left(failure),
      (match) async {
        // Observations need a token of a manager of the match; without
        // permission (or without report) the detail is shown without them.
        String? refereeObservations;
        if (match.status == MatchStatus.finished) {
          final reportResult =
              await matchRepository.getRefereeReport(params.matchId);
          reportResult.fold((_) {}, (obs) => refereeObservations = obs);
        }

        return Right(MatchDetailResult(
          match: match,
          refereeObservations: refereeObservations,
        ));
      },
    );
  }
}

/// Parameters for GetMatchDetailUseCase
class GetMatchDetailParams extends Equatable {
  final String matchId;

  const GetMatchDetailParams({required this.matchId});

  @override
  List<Object?> get props => [matchId];
}
