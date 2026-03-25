import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../repositories/team_repository.dart';

class UpdateStandingsParams extends Equatable {
  final String teamId;
  final String tournamentId;
  final String leagueId;
  final int? matchesPlayed;
  final int? matchesWon;
  final int? matchesDrawn;
  final int? matchesLost;
  final int? goalsFor;
  final int? goalsAgainst;
  final int? pointsAdjustment;
  final String? adjustmentReason;

  const UpdateStandingsParams({
    required this.teamId,
    required this.tournamentId,
    required this.leagueId,
    this.matchesPlayed,
    this.matchesWon,
    this.matchesDrawn,
    this.matchesLost,
    this.goalsFor,
    this.goalsAgainst,
    this.pointsAdjustment,
    this.adjustmentReason,
  });

  @override
  List<Object?> get props => [
        teamId, tournamentId, leagueId,
        matchesPlayed, matchesWon, matchesDrawn, matchesLost,
        goalsFor, goalsAgainst, pointsAdjustment, adjustmentReason,
      ];
}

class UpdateStandingsUseCase {
  final TeamRepository repository;

  UpdateStandingsUseCase(this.repository);

  Future<Either<Failure, void>> call(UpdateStandingsParams params) {
    return repository.updateStandings(
      teamId: params.teamId,
      tournamentId: params.tournamentId,
      leagueId: params.leagueId,
      matchesPlayed: params.matchesPlayed,
      matchesWon: params.matchesWon,
      matchesDrawn: params.matchesDrawn,
      matchesLost: params.matchesLost,
      goalsFor: params.goalsFor,
      goalsAgainst: params.goalsAgainst,
      pointsAdjustment: params.pointsAdjustment,
      adjustmentReason: params.adjustmentReason,
    );
  }
}
