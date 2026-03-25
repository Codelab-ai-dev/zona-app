import 'package:equatable/equatable.dart';
import '../../../core/utils/fixture_config.dart';
import '../../../domain/entities/team_entity.dart';
import '../../../domain/entities/tournament_entity.dart';

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

/// Load Matches by Tournament
class LoadMatchesByTournamentEvent extends MatchEvent {
  final String tournamentId;

  const LoadMatchesByTournamentEvent({required this.tournamentId});

  @override
  List<Object?> get props => [tournamentId];
}

/// Update Match Result
class UpdateMatchResultEvent extends MatchEvent {
  final String matchId;
  final int homeScore;
  final int awayScore;

  const UpdateMatchResultEvent({
    required this.matchId,
    required this.homeScore,
    required this.awayScore,
  });

  @override
  List<Object?> get props => [matchId, homeScore, awayScore];
}

/// Reset Match State
class ResetMatchStateEvent extends MatchEvent {
  const ResetMatchStateEvent();
}

/// Generate Fixtures for a tournament
class GenerateFixturesEvent extends MatchEvent {
  final FixtureConfig config;
  final List<TeamEntity> teams;
  final TournamentEntity tournament;

  const GenerateFixturesEvent({
    required this.config,
    required this.teams,
    required this.tournament,
  });

  @override
  List<Object?> get props => [config, teams, tournament];
}

/// Generate Fixtures using CP-SAT solver (server-side)
class GenerateFixturesCpSatEvent extends MatchEvent {
  final FixtureConfig config;
  final List<TeamEntity> teams;
  final TournamentEntity tournament;

  const GenerateFixturesCpSatEvent({
    required this.config,
    required this.teams,
    required this.tournament,
  });

  @override
  List<Object?> get props => [config, teams, tournament];
}

/// Save generated fixtures to database
class SaveFixturesEvent extends MatchEvent {
  final List<Map<String, dynamic>> matches;

  const SaveFixturesEvent({required this.matches});

  @override
  List<Object?> get props => [matches];
}

/// Save a manually created/edited round
/// Handles inserts, updates, and deletes atomically
class SaveManualRoundEvent extends MatchEvent {
  final List<Map<String, dynamic>> matchesToCreate;
  final List<ManualMatchUpdate> matchesToUpdate;
  final List<String> matchIdsToDelete;

  const SaveManualRoundEvent({
    this.matchesToCreate = const [],
    this.matchesToUpdate = const [],
    this.matchIdsToDelete = const [],
  });

  @override
  List<Object?> get props => [matchesToCreate, matchesToUpdate, matchIdsToDelete];
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

/// Helper class for manual match updates
class ManualMatchUpdate {
  final String matchId;
  final Map<String, dynamic> data;

  const ManualMatchUpdate({required this.matchId, required this.data});
}
