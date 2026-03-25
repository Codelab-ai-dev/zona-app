import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/match_entity.dart';
import '../entities/player_stats_entity.dart';
import '../repositories/match_repository.dart';
import '../repositories/player_stats_repository.dart';

/// Result object containing match data and per-team player stats
class MatchDetailResult extends Equatable {
  final MatchEntity match;
  final List<PlayerStatsEntity> homePlayerStats;
  final List<PlayerStatsEntity> awayPlayerStats;
  final String? refereeObservations;

  const MatchDetailResult({
    required this.match,
    this.homePlayerStats = const [],
    this.awayPlayerStats = const [],
    this.refereeObservations,
  });

  @override
  List<Object?> get props =>
      [match, homePlayerStats, awayPlayerStats, refereeObservations];
}

/// Get Match Detail Use Case
/// Composes match data + player stats for a single match
class GetMatchDetailUseCase {
  final MatchRepository matchRepository;
  final PlayerStatsRepository playerStatsRepository;

  GetMatchDetailUseCase(this.matchRepository, this.playerStatsRepository);

  Future<Either<Failure, MatchDetailResult>> call(
    GetMatchDetailParams params,
  ) async {
    if (params.matchId.isEmpty) {
      return Left(ValidationFailure('Match ID cannot be empty'));
    }

    // Fetch match data
    final matchResult = await matchRepository.getMatchById(params.matchId);

    return matchResult.fold(
      (failure) => Left(failure),
      (match) async {
        // Try to fetch player stats — gracefully degrade if it fails
        List<PlayerStatsEntity> homeStats = [];
        List<PlayerStatsEntity> awayStats = [];

        try {
          final statsResult = await playerStatsRepository.getPlayerStatsByMatch(
            params.matchId,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
          );

          statsResult.fold(
            (failure) {
              // Gracefully degrade — still show match info without stats
            },
            (statsMap) {
              homeStats = statsMap['home'] ?? [];
              awayStats = statsMap['away'] ?? [];
            },
          );
        } catch (_) {
          // Gracefully degrade
        }

        // Try to fetch referee observations — gracefully degrade
        String? refereeObservations;
        try {
          final reportResult =
              await matchRepository.getRefereeReport(params.matchId);
          reportResult.fold(
            (_) {}, // Gracefully degrade
            (obs) => refereeObservations = obs,
          );
        } catch (_) {
          // Gracefully degrade
        }

        return Right(MatchDetailResult(
          match: match,
          homePlayerStats: homeStats,
          awayPlayerStats: awayStats,
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
