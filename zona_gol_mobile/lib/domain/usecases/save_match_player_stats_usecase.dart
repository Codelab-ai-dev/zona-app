import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../repositories/match_repository.dart';
import '../repositories/player_stats_repository.dart';

/// Save Match Player Stats Use Case
/// Saves per-player stats AND updates the match score + status in one operation
class SaveMatchPlayerStatsUseCase {
  final PlayerStatsRepository playerStatsRepository;
  final MatchRepository matchRepository;

  SaveMatchPlayerStatsUseCase(this.playerStatsRepository, this.matchRepository);

  Future<Either<Failure, void>> call(SaveMatchPlayerStatsParams params) async {
    if (params.matchId.isEmpty) {
      return Left(ValidationFailure('Match ID cannot be empty'));
    }

    if (params.homeScore < 0 || params.awayScore < 0) {
      return Left(ValidationFailure('Los marcadores no pueden ser negativos'));
    }

    // Validate goals match score
    final homeGoals =
        params.homeEntries.fold<int>(0, (sum, e) => sum + e.goals);
    final awayGoals =
        params.awayEntries.fold<int>(0, (sum, e) => sum + e.goals);

    if (homeGoals != params.homeScore) {
      return Left(ValidationFailure(
        'Los goles del local ($homeGoals) no coinciden con el marcador (${params.homeScore})',
      ));
    }

    if (awayGoals != params.awayScore) {
      return Left(ValidationFailure(
        'Los goles del visitante ($awayGoals) no coinciden con el marcador (${params.awayScore})',
      ));
    }

    // 1. Save player stats
    final allEntries = [...params.homeEntries, ...params.awayEntries];
    final statsResult = await playerStatsRepository.saveMatchPlayerStats(
      matchId: params.matchId,
      entries: allEntries,
    );

    return statsResult.fold(
      (failure) => Left(failure),
      (_) async {
        // 2. Update match score and status
        final matchResult = await matchRepository.updateMatchResult(
          matchId: params.matchId,
          homeScore: params.homeScore,
          awayScore: params.awayScore,
        );

        return matchResult.fold(
          (failure) => Left(failure),
          (_) async {
            // 3. Save referee observations if provided
            if (params.observations != null &&
                params.observations!.trim().isNotEmpty) {
              final reportResult = await matchRepository.saveRefereeReport(
                params.matchId,
                params.observations!.trim(),
              );
              // Graceful degrade — don't fail the whole operation
              reportResult.fold(
                (failure) => print('⚠️ Failed to save referee report: ${failure.message}'),
                (_) {},
              );
            }
            return const Right(null);
          },
        );
      },
    );
  }
}

class SaveMatchPlayerStatsParams extends Equatable {
  final String matchId;
  final int homeScore;
  final int awayScore;
  final List<PlayerMatchStatEntry> homeEntries;
  final List<PlayerMatchStatEntry> awayEntries;
  final String? observations;

  const SaveMatchPlayerStatsParams({
    required this.matchId,
    required this.homeScore,
    required this.awayScore,
    this.homeEntries = const [],
    this.awayEntries = const [],
    this.observations,
  });

  @override
  List<Object?> get props =>
      [matchId, homeScore, awayScore, homeEntries, awayEntries, observations];
}
