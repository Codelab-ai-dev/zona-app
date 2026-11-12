import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../repositories/team_repository.dart';

class UpdateStandingsParams extends Equatable {
  final String teamId;
  final String tournamentId;
  final int matchesPlayed;
  final int matchesWon;
  final int matchesDrawn;
  final int matchesLost;
  final int goalsFor;
  final int goalsAgainst;
  final int? pointsAdjustment;
  final String? adjustmentReason;

  const UpdateStandingsParams({
    required this.teamId,
    required this.tournamentId,
    required this.matchesPlayed,
    required this.matchesWon,
    required this.matchesDrawn,
    required this.matchesLost,
    required this.goalsFor,
    required this.goalsAgainst,
    this.pointsAdjustment,
    this.adjustmentReason,
  });

  @override
  List<Object?> get props => [
        teamId, tournamentId,
        matchesPlayed, matchesWon, matchesDrawn, matchesLost,
        goalsFor, goalsAgainst, pointsAdjustment, adjustmentReason,
      ];
}

/// Sets a team's standings totals (the server stores the difference with the
/// match data as adjustments) and its points adjustment.
class UpdateStandingsUseCase {
  final TeamRepository repository;

  UpdateStandingsUseCase(this.repository);

  Future<Either<Failure, void>> call(UpdateStandingsParams params) async {
    final values = [
      params.matchesPlayed, params.matchesWon, params.matchesDrawn,
      params.matchesLost, params.goalsFor, params.goalsAgainst,
    ];
    if (values.any((v) => v < 0 || v > 1000)) {
      return const Left(ValidationFailure('Los valores deben estar entre 0 y 1000'));
    }
    if (params.matchesWon + params.matchesDrawn + params.matchesLost != params.matchesPlayed) {
      return const Left(ValidationFailure('PJ debe ser la suma de PG, PE y PP'));
    }
    final reason = params.adjustmentReason?.trim() ?? '';
    if ((params.pointsAdjustment ?? 0) != 0 && reason.isEmpty) {
      return const Left(ValidationFailure('Indica la razón del ajuste de puntos'));
    }
    if (reason.length > 500) {
      return const Left(ValidationFailure('La razón admite como máximo 500 caracteres'));
    }
    return repository.updateStandings(
      teamId: params.teamId,
      tournamentId: params.tournamentId,
      matchesPlayed: params.matchesPlayed,
      matchesWon: params.matchesWon,
      matchesDrawn: params.matchesDrawn,
      matchesLost: params.matchesLost,
      goalsFor: params.goalsFor,
      goalsAgainst: params.goalsAgainst,
      pointsAdjustment: params.pointsAdjustment,
      adjustmentReason: reason,
    );
  }
}
