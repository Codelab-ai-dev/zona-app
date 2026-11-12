import 'package:equatable/equatable.dart';

import '../../../domain/entities/match_entity.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/repositories/match_repository.dart';

/// Match Events
abstract class MatchEvent extends Equatable {
  const MatchEvent();

  @override
  List<Object?> get props => [];
}

/// Load Pending Matches by League
class LoadPendingMatchesEvent extends MatchEvent {
  final String leagueId;

  const LoadPendingMatchesEvent({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}

/// Load Matches by Tournament (optionally only one phase)
class LoadMatchesByTournamentEvent extends MatchEvent {
  final String tournamentId;
  final MatchPhase? phase;

  const LoadMatchesByTournamentEvent({required this.tournamentId, this.phase});

  @override
  List<Object?> get props => [tournamentId, phase];
}

/// Preview a fixture: the server generates it without saving (dry run)
class GenerateFixturesEvent extends MatchEvent {
  final FixtureRequest request;
  final List<TeamEntity> teams;

  const GenerateFixturesEvent({required this.request, required this.teams});

  @override
  List<Object?> get props => [request, teams];
}

/// Save the previewed fixture (same request without dry run)
class SaveFixturesEvent extends MatchEvent {
  final FixtureRequest request;

  const SaveFixturesEvent({required this.request});

  @override
  List<Object?> get props => [request];
}

/// Save a manually created/edited round
class SaveManualRoundEvent extends MatchEvent {
  final String tournamentId;
  final List<NewMatch> matchesToCreate;
  final List<ManualMatchUpdate> matchesToUpdate;
  final List<String> matchIdsToDelete;

  const SaveManualRoundEvent({
    required this.tournamentId,
    this.matchesToCreate = const [],
    this.matchesToUpdate = const [],
    this.matchIdsToDelete = const [],
  });

  @override
  List<Object?> get props =>
      [tournamentId, matchesToCreate, matchesToUpdate, matchIdsToDelete];
}

/// Create a single match
class CreateMatchEvent extends MatchEvent {
  final String tournamentId;
  final String homeTeamId;
  final String awayTeamId;
  final DateTime matchDate;
  final String? matchTime;
  final int? fieldNumber;
  final int? round;

  const CreateMatchEvent({
    required this.tournamentId,
    required this.homeTeamId,
    required this.awayTeamId,
    required this.matchDate,
    this.matchTime,
    this.fieldNumber,
    this.round,
  });

  @override
  List<Object?> get props => [tournamentId, homeTeamId, awayTeamId, matchDate, matchTime, fieldNumber, round];
}

/// Publish or hide every match of a round, then reload the tournament
class PublishRoundEvent extends MatchEvent {
  final String tournamentId;
  final int round;
  final bool isPublished;

  const PublishRoundEvent({
    required this.tournamentId,
    required this.round,
    required this.isPublished,
  });

  @override
  List<Object?> get props => [tournamentId, round, isPublished];
}

/// Helper class for manual match updates
class ManualMatchUpdate extends Equatable {
  final String matchId;
  final MatchScheduleUpdate update;

  const ManualMatchUpdate({required this.matchId, required this.update});

  @override
  List<Object?> get props => [matchId, update];
}
