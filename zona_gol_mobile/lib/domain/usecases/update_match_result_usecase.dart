import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/match_entity.dart';
import '../repositories/match_repository.dart';

/// Update Match Result Use Case
/// Updates the score and marks match as finished
class UpdateMatchResultUseCase {
  final MatchRepository repository;

  UpdateMatchResultUseCase(this.repository);

  Future<Either<Failure, MatchEntity>> call(
    UpdateMatchResultParams params,
  ) async {
    // Validate match ID
    if (params.matchId.isEmpty) {
      return Left(ValidationFailure('Match ID cannot be empty'));
    }

    // Validate scores
    if (params.homeScore < 0) {
      return Left(ValidationFailure('El marcador local no puede ser negativo'));
    }

    if (params.awayScore < 0) {
      return Left(ValidationFailure('El marcador visitante no puede ser negativo'));
    }

    return await repository.updateMatchResult(
      matchId: params.matchId,
      homeScore: params.homeScore,
      awayScore: params.awayScore,
    );
  }
}

/// Parameters for UpdateMatchResultUseCase
class UpdateMatchResultParams extends Equatable {
  final String matchId;
  final int homeScore;
  final int awayScore;

  const UpdateMatchResultParams({
    required this.matchId,
    required this.homeScore,
    required this.awayScore,
  });

  @override
  List<Object?> get props => [matchId, homeScore, awayScore];
}
