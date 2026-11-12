import 'package:equatable/equatable.dart';

/// Match Entity
/// Represents a match in the domain layer
class MatchEntity extends Equatable {
  final String id;
  final String tournamentId;
  final String homeTeamId;
  final String awayTeamId;
  final int? homeScore;
  final int? awayScore;
  final DateTime matchDate;
  final String? matchTime;
  final int? fieldNumber;
  final int? round;
  final MatchStatus status;
  final MatchPhase phase;
  final PlayoffRound? playoffRound;
  final int? playoffPosition;
  final MatchLeg? leg;
  final bool isPublished;
  final String? byeTeamId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Related entities (populated when fetched with joins)
  final MatchTeamInfo? homeTeam;
  final MatchTeamInfo? awayTeam;
  final String? tournamentName;

  // Result events (only filled by the match detail endpoint)
  final List<MatchGoal> goals;
  final List<MatchCard> cards;

  const MatchEntity({
    required this.id,
    required this.tournamentId,
    required this.homeTeamId,
    required this.awayTeamId,
    this.homeScore,
    this.awayScore,
    required this.matchDate,
    this.matchTime,
    this.fieldNumber,
    this.round,
    this.status = MatchStatus.scheduled,
    this.phase = MatchPhase.regular,
    this.playoffRound,
    this.playoffPosition,
    this.leg,
    this.isPublished = false,
    this.byeTeamId,
    this.createdAt,
    this.updatedAt,
    this.homeTeam,
    this.awayTeam,
    this.tournamentName,
    this.goals = const [],
    this.cards = const [],
  });

  @override
  List<Object?> get props => [
        id,
        tournamentId,
        homeTeamId,
        awayTeamId,
        homeScore,
        awayScore,
        matchDate,
        matchTime,
        fieldNumber,
        round,
        status,
        phase,
        playoffRound,
        playoffPosition,
        leg,
        isPublished,
        byeTeamId,
        createdAt,
        updatedAt,
        homeTeam,
        awayTeam,
        tournamentName,
        goals,
        cards,
      ];

  /// Check if match has a result
  bool get hasResult => homeScore != null && awayScore != null;

  /// A result can be entered (or corrected) unless the match was cancelled
  bool get canEnterResult => status != MatchStatus.cancelled;

  /// Check if match is pending (scheduled or in progress)
  bool get isPending =>
      status == MatchStatus.scheduled || status == MatchStatus.inProgress;

  /// Check if match is finished
  bool get isFinished => status == MatchStatus.finished;

  /// Get status text in Spanish
  String get statusText => status.displayText;

  /// Get result text (e.g., "2 - 1")
  String get resultText {
    if (!hasResult) return '- vs -';
    return '$homeScore - $awayScore';
  }

  /// Get match display text
  String get displayText {
    final home = homeTeam?.name ?? 'Local';
    final away = awayTeam?.name ?? 'Visitante';
    return '$home vs $away';
  }

  /// Get round display text
  String get roundText {
    if (phase == MatchPhase.playoffs && playoffRound != null) {
      return playoffRound!.displayText;
    }
    return round != null ? 'Jornada $round' : '';
  }

  /// Copy with method for updates
  MatchEntity copyWith({
    String? id,
    String? tournamentId,
    String? homeTeamId,
    String? awayTeamId,
    int? homeScore,
    int? awayScore,
    DateTime? matchDate,
    String? matchTime,
    int? fieldNumber,
    int? round,
    MatchStatus? status,
    MatchPhase? phase,
    PlayoffRound? playoffRound,
    int? playoffPosition,
    MatchLeg? leg,
    bool? isPublished,
    String? byeTeamId,
    DateTime? createdAt,
    DateTime? updatedAt,
    MatchTeamInfo? homeTeam,
    MatchTeamInfo? awayTeam,
    String? tournamentName,
    List<MatchGoal>? goals,
    List<MatchCard>? cards,
  }) {
    return MatchEntity(
      id: id ?? this.id,
      tournamentId: tournamentId ?? this.tournamentId,
      homeTeamId: homeTeamId ?? this.homeTeamId,
      awayTeamId: awayTeamId ?? this.awayTeamId,
      homeScore: homeScore ?? this.homeScore,
      awayScore: awayScore ?? this.awayScore,
      matchDate: matchDate ?? this.matchDate,
      matchTime: matchTime ?? this.matchTime,
      fieldNumber: fieldNumber ?? this.fieldNumber,
      round: round ?? this.round,
      status: status ?? this.status,
      phase: phase ?? this.phase,
      playoffRound: playoffRound ?? this.playoffRound,
      playoffPosition: playoffPosition ?? this.playoffPosition,
      leg: leg ?? this.leg,
      isPublished: isPublished ?? this.isPublished,
      byeTeamId: byeTeamId ?? this.byeTeamId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      homeTeam: homeTeam ?? this.homeTeam,
      awayTeam: awayTeam ?? this.awayTeam,
      tournamentName: tournamentName ?? this.tournamentName,
      goals: goals ?? this.goals,
      cards: cards ?? this.cards,
    );
  }
}

/// Match Team Info (lightweight team data for display)
class MatchTeamInfo extends Equatable {
  final String id;
  final String name;
  final String? logo;
  final String? slug;

  const MatchTeamInfo({
    required this.id,
    required this.name,
    this.logo,
    this.slug,
  });

  @override
  List<Object?> get props => [id, name, logo, slug];
}

/// Match Status Enum
enum MatchStatus {
  scheduled,
  inProgress,
  finished,
  cancelled,
}

/// Extension to convert string to MatchStatus
extension MatchStatusExtension on String {
  MatchStatus toMatchStatus() {
    switch (toLowerCase()) {
      case 'scheduled':
        return MatchStatus.scheduled;
      case 'in_progress':
        return MatchStatus.inProgress;
      case 'finished':
        return MatchStatus.finished;
      case 'cancelled':
        return MatchStatus.cancelled;
      default:
        return MatchStatus.scheduled;
    }
  }
}

/// Extension to convert MatchStatus to string
extension MatchStatusToString on MatchStatus {
  /// Status text in Spanish
  String get displayText {
    switch (this) {
      case MatchStatus.scheduled:
        return 'Programado';
      case MatchStatus.inProgress:
        return 'En Curso';
      case MatchStatus.finished:
        return 'Finalizado';
      case MatchStatus.cancelled:
        return 'Cancelado';
    }
  }

  String toDbString() {
    switch (this) {
      case MatchStatus.scheduled:
        return 'scheduled';
      case MatchStatus.inProgress:
        return 'in_progress';
      case MatchStatus.finished:
        return 'finished';
      case MatchStatus.cancelled:
        return 'cancelled';
    }
  }
}

/// Match Phase Enum
enum MatchPhase {
  regular,
  playoffs,
}

/// Extension to convert string to MatchPhase
extension MatchPhaseExtension on String {
  MatchPhase toMatchPhase() {
    switch (toLowerCase()) {
      case 'playoffs':
        return MatchPhase.playoffs;
      default:
        return MatchPhase.regular;
    }
  }
}

/// Playoff Round Enum
enum PlayoffRound {
  quarterfinals,
  semifinals,
  thirdPlace,
  final_,
}

/// Extension for PlayoffRound
extension PlayoffRoundExtension on String {
  PlayoffRound? toPlayoffRound() {
    switch (toLowerCase()) {
      case 'quarterfinals':
        return PlayoffRound.quarterfinals;
      case 'semifinals':
        return PlayoffRound.semifinals;
      case 'third_place':
        return PlayoffRound.thirdPlace;
      case 'final':
        return PlayoffRound.final_;
      default:
        return null;
    }
  }
}

extension PlayoffRoundDisplay on PlayoffRound {
  String get displayText {
    switch (this) {
      case PlayoffRound.quarterfinals:
        return 'Cuartos de Final';
      case PlayoffRound.semifinals:
        return 'Semifinales';
      case PlayoffRound.thirdPlace:
        return 'Tercer Lugar';
      case PlayoffRound.final_:
        return 'Final';
    }
  }

  String toDbString() {
    switch (this) {
      case PlayoffRound.quarterfinals:
        return 'quarterfinals';
      case PlayoffRound.semifinals:
        return 'semifinals';
      case PlayoffRound.thirdPlace:
        return 'third_place';
      case PlayoffRound.final_:
        return 'final';
    }
  }
}

/// Match Leg Enum (for two-legged ties)
enum MatchLeg {
  first,
  second,
}

/// Extension for MatchLeg
extension MatchLegExtension on String {
  MatchLeg? toMatchLeg() {
    switch (toLowerCase()) {
      case 'first':
        return MatchLeg.first;
      case 'second':
        return MatchLeg.second;
      default:
        return null;
    }
  }
}

/// Goal type of a match goal
enum GoalType { normal, penalty, ownGoal, freeKick }

extension GoalTypeX on GoalType {
  String toApiString() {
    switch (this) {
      case GoalType.normal:
        return 'normal';
      case GoalType.penalty:
        return 'penalty';
      case GoalType.ownGoal:
        return 'own_goal';
      case GoalType.freeKick:
        return 'free_kick';
    }
  }

  String get displayText {
    switch (this) {
      case GoalType.normal:
        return 'Normal';
      case GoalType.penalty:
        return 'Penal';
      case GoalType.ownGoal:
        return 'Autogol';
      case GoalType.freeKick:
        return 'Tiro libre';
    }
  }

  static GoalType fromApi(String? value) {
    switch (value) {
      case 'penalty':
        return GoalType.penalty;
      case 'own_goal':
        return GoalType.ownGoal;
      case 'free_kick':
        return GoalType.freeKick;
      default:
        return GoalType.normal;
    }
  }
}

/// Disciplinary card color
enum CardType { yellow, red }

extension CardTypeX on CardType {
  String toApiString() => this == CardType.red ? 'red' : 'yellow';

  String get displayText => this == CardType.red ? 'Roja' : 'Amarilla';

  static CardType fromApi(String? value) =>
      value == 'red' ? CardType.red : CardType.yellow;
}

/// A goal of a match. [teamId] is the team of the player who scored
/// (an own goal counts for the other team).
class MatchGoal extends Equatable {
  final String? id;
  final String playerId;
  final String teamId;
  final int minute;
  final GoalType goalType;
  final String? assistPlayerId;
  final String? playerName;
  final int? playerJersey;
  final String? assistPlayerName;

  const MatchGoal({
    this.id,
    required this.playerId,
    required this.teamId,
    required this.minute,
    this.goalType = GoalType.normal,
    this.assistPlayerId,
    this.playerName,
    this.playerJersey,
    this.assistPlayerName,
  });

  bool get isOwnGoal => goalType == GoalType.ownGoal;

  @override
  List<Object?> get props => [
        id,
        playerId,
        teamId,
        minute,
        goalType,
        assistPlayerId,
        playerName,
        playerJersey,
        assistPlayerName,
      ];
}

/// A card shown in a match
class MatchCard extends Equatable {
  final String? id;
  final String playerId;
  final String teamId;
  final CardType cardType;
  final int minute;
  final String? playerName;
  final int? playerJersey;

  const MatchCard({
    this.id,
    required this.playerId,
    required this.teamId,
    required this.cardType,
    required this.minute,
    this.playerName,
    this.playerJersey,
  });

  @override
  List<Object?> get props =>
      [id, playerId, teamId, cardType, minute, playerName, playerJersey];
}

/// The full result of a match as the API stores it: score plus goal and card
/// events (player stats are derived from them on the server).
class MatchResultInput extends Equatable {
  final int homeScore;
  final int awayScore;
  final List<MatchGoal> goals;
  final List<MatchCard> cards;
  final String? observations;

  const MatchResultInput({
    required this.homeScore,
    required this.awayScore,
    this.goals = const [],
    this.cards = const [],
    this.observations,
  });

  @override
  List<Object?> get props => [homeScore, awayScore, goals, cards, observations];
}

/// Data for creating a match (POST /matches and bulk creation)
class NewMatch extends Equatable {
  final String tournamentId;
  final String homeTeamId;
  final String awayTeamId;
  final DateTime matchDate;
  final String? matchTime; // HH:MM
  final int? fieldNumber;
  final int? round;
  final MatchPhase phase;
  final PlayoffRound? playoffRound;
  final int? playoffPosition;
  final MatchLeg? leg;

  const NewMatch({
    required this.tournamentId,
    required this.homeTeamId,
    required this.awayTeamId,
    required this.matchDate,
    this.matchTime,
    this.fieldNumber,
    this.round,
    this.phase = MatchPhase.regular,
    this.playoffRound,
    this.playoffPosition,
    this.leg,
  });

  @override
  List<Object?> get props => [
        tournamentId,
        homeTeamId,
        awayTeamId,
        matchDate,
        matchTime,
        fieldNumber,
        round,
        phase,
        playoffRound,
        playoffPosition,
        leg,
      ];
}

/// Changes to a match's schedule (PATCH /matches/{id}/schedule).
/// Null fields are left unchanged; teams can only change while scheduled.
class MatchScheduleUpdate extends Equatable {
  final DateTime? matchDate;
  final String? matchTime; // HH:MM
  final int? fieldNumber;
  final int? round;
  final String? homeTeamId;
  final String? awayTeamId;

  const MatchScheduleUpdate({
    this.matchDate,
    this.matchTime,
    this.fieldNumber,
    this.round,
    this.homeTeamId,
    this.awayTeamId,
  });

  @override
  List<Object?> get props =>
      [matchDate, matchTime, fieldNumber, round, homeTeamId, awayTeamId];
}
