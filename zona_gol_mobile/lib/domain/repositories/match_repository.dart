import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/match_entity.dart';

/// Match Repository Interface
/// Defines the contract for match data operations
abstract class MatchRepository {
  /// Get all pending matches for a league (scheduled or in_progress)
  Future<Either<Failure, List<MatchEntity>>> getPendingMatchesByLeague(
    String leagueId,
  );

  /// Get all matches for a tournament, optionally filtered
  Future<Either<Failure, List<MatchEntity>>> getMatchesByTournament(
    String tournamentId, {
    MatchStatus? status,
    int? round,
    MatchPhase? phase,
  });

  /// Get a single match by ID, including its goals and cards
  Future<Either<Failure, MatchEntity>> getMatchById(String matchId);

  /// Save the result of a match (score, goals, cards and observations).
  /// Replaces any result stored before and marks the match as finished.
  Future<Either<Failure, void>> submitMatchResult(
    String matchId,
    MatchResultInput result,
  );

  /// Start, cancel or reschedule a match without a result
  Future<Either<Failure, void>> updateMatchStatus({
    required String matchId,
    required MatchStatus status,
  });

  /// Publish or hide a single match
  Future<Either<Failure, void>> setMatchPublished(
    String matchId,
    bool isPublished,
  );

  /// Publish or hide every match of a tournament round
  Future<Either<Failure, void>> publishRound({
    required String tournamentId,
    required int round,
    required bool isPublished,
  });

  /// Create a single match
  Future<Either<Failure, MatchEntity>> createMatch(NewMatch match);

  /// Create several matches of a tournament in one transaction
  Future<Either<Failure, List<MatchEntity>>> createMatches(
    String tournamentId,
    List<NewMatch> matches,
  );

  /// Generate a round-robin calendar on the server. With
  /// [FixtureRequest.dryRun] nothing is saved (preview).
  Future<Either<Failure, FixtureGenerationResult>> generateFixtures(
    FixtureRequest request,
  );

  /// Generate a playoff bracket from the given seeds (1st seed first)
  Future<Either<Failure, List<MatchEntity>>> generatePlayoffs(
    PlayoffRequest request,
  );

  /// Update match schedule details (teams, date, time, field, round)
  Future<Either<Failure, MatchEntity>> updateMatchSchedule(
    String matchId,
    MatchScheduleUpdate update,
  );

  /// Permanently delete matches by IDs (only scheduled matches can be deleted)
  Future<Either<Failure, void>> deleteMatches(List<String> matchIds);

  /// Get referee report observations for a match (null when there is none)
  Future<Either<Failure, String?>> getRefereeReport(String matchId);
}

/// When and where the generated rounds are played
class FixtureSchedule extends Equatable {
  final DateTime startDate;
  final DateTime? endDate;

  /// Dart weekdays: 1 = Monday ... 7 = Sunday
  final List<int> matchDays;
  final String startTime; // HH:MM
  final String? endTime; // HH:MM
  final int fieldsAvailable;
  final int halfMinutes;
  final int halftimeBreakMinutes;
  final int breakBetweenMatches;

  const FixtureSchedule({
    required this.startDate,
    this.endDate,
    required this.matchDays,
    required this.startTime,
    this.endTime,
    this.fieldsAvailable = 1,
    this.halfMinutes = 25,
    this.halftimeBreakMinutes = 10,
    this.breakBetweenMatches = 5,
  });

  @override
  List<Object?> get props => [
        startDate,
        endDate,
        matchDays,
        startTime,
        endTime,
        fieldsAvailable,
        halfMinutes,
        halftimeBreakMinutes,
        breakBetweenMatches,
      ];
}

/// A team taking part in a generated calendar
class FixtureTeam extends Equatable {
  final String id;
  final String name;

  const FixtureTeam({required this.id, required this.name});

  @override
  List<Object?> get props => [id, name];
}

/// Fixture generation request (POST /tournaments/{id}/fixtures/generate)
class FixtureRequest extends Equatable {
  final String tournamentId;
  final List<FixtureTeam> teams;

  /// Group stage: each group plays its own round robin. When not empty,
  /// [teams] is ignored by the server.
  final Map<String, List<FixtureTeam>> groups;
  final bool isDoubleRound;
  final FixtureSchedule schedule;
  final bool dryRun;

  const FixtureRequest({
    required this.tournamentId,
    this.teams = const [],
    this.groups = const {},
    this.isDoubleRound = false,
    required this.schedule,
    this.dryRun = false,
  });

  FixtureRequest copyWith({bool? dryRun}) => FixtureRequest(
        tournamentId: tournamentId,
        teams: teams,
        groups: groups,
        isDoubleRound: isDoubleRound,
        schedule: schedule,
        dryRun: dryRun ?? this.dryRun,
      );

  @override
  List<Object?> get props =>
      [tournamentId, teams, groups, isDoubleRound, schedule, dryRun];
}

/// Generated calendar. In a dry run the matches have no id.
class FixtureGenerationResult extends Equatable {
  final List<MatchEntity> matches;
  final int rounds;

  const FixtureGenerationResult({required this.matches, required this.rounds});

  @override
  List<Object?> get props => [matches, rounds];
}

/// Playoff bracket request (POST /tournaments/{id}/playoffs/generate)
class PlayoffRequest extends Equatable {
  final String tournamentId;
  final int numTeams; // 4 or 8
  final DateTime startDate;
  final String startTime; // HH:MM
  final int fieldNumber;
  final bool thirdPlaceMatch;
  final bool homeAndAway;

  /// Qualified teams in seed order; empty = use the standings
  final List<String> teamIds;

  const PlayoffRequest({
    required this.tournamentId,
    required this.numTeams,
    required this.startDate,
    required this.startTime,
    required this.fieldNumber,
    this.thirdPlaceMatch = false,
    this.homeAndAway = false,
    this.teamIds = const [],
  });

  @override
  List<Object?> get props => [
        tournamentId,
        numTeams,
        startDate,
        startTime,
        fieldNumber,
        thirdPlaceMatch,
        homeAndAway,
        teamIds,
      ];
}
