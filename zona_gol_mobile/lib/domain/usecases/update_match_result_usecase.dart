import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/match_entity.dart';
import '../repositories/match_repository.dart';

/// Update Match Result Use Case
/// Saves the score with its goals and cards (the server derives the player
/// stats from them) and marks the match as finished
class UpdateMatchResultUseCase {
  final MatchRepository repository;

  UpdateMatchResultUseCase(this.repository);

  Future<Either<Failure, void>> call(UpdateMatchResultParams params) async {
    if (params.matchId.isEmpty) {
      return const Left(ValidationFailure('Partido no válido'));
    }

    final error = validate(params.result, params.homeTeamId, params.awayTeamId);
    if (error != null) return Left(ValidationFailure(error));

    return repository.submitMatchResult(params.matchId, params.result);
  }

  /// Same rules as the web result form and the API: non-negative scores,
  /// minutes 1..120 and no more goals credited to a team than its score
  /// (an own goal counts for the other team).
  static String? validate(
    MatchResultInput result,
    String homeTeamId,
    String awayTeamId,
  ) {
    if (result.homeScore < 0 || result.awayScore < 0) {
      return 'Los marcadores no pueden ser negativos';
    }
    final minutes = [
      ...result.goals.map((g) => g.minute),
      ...result.cards.map((c) => c.minute),
    ];
    if (minutes.any((m) => m < 1 || m > 120)) {
      return 'El minuto debe estar entre 1 y 120';
    }
    final home = creditedGoals(result.goals, homeTeamId, awayTeamId);
    final away = creditedGoals(result.goals, awayTeamId, homeTeamId);
    if (home > result.homeScore || away > result.awayScore) {
      return 'Hay más goles registrados que el marcador del equipo';
    }
    return null;
  }

  /// Goals that count for [teamId]: its own goals plus the rival's own goals.
  static int creditedGoals(
    List<MatchGoal> goals,
    String teamId,
    String rivalId,
  ) =>
      goals
          .where((g) => g.isOwnGoal ? g.teamId == rivalId : g.teamId == teamId)
          .length;
}

/// Parameters for UpdateMatchResultUseCase
class UpdateMatchResultParams extends Equatable {
  final String matchId;
  final String homeTeamId;
  final String awayTeamId;
  final MatchResultInput result;

  const UpdateMatchResultParams({
    required this.matchId,
    required this.homeTeamId,
    required this.awayTeamId,
    required this.result,
  });

  @override
  List<Object?> get props => [matchId, homeTeamId, awayTeamId, result];
}
