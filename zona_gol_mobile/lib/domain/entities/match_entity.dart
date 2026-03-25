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
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Related entities (populated when fetched with joins)
  final MatchTeamInfo? homeTeam;
  final MatchTeamInfo? awayTeam;
  final String? tournamentName;

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
    this.createdAt,
    this.updatedAt,
    this.homeTeam,
    this.awayTeam,
    this.tournamentName,
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
        createdAt,
        updatedAt,
        homeTeam,
        awayTeam,
        tournamentName,
      ];

  /// Check if match has a result
  bool get hasResult => homeScore != null && awayScore != null;

  /// Check if match is pending (scheduled or in progress)
  bool get isPending =>
      status == MatchStatus.scheduled || status == MatchStatus.inProgress;

  /// Check if match is finished
  bool get isFinished => status == MatchStatus.finished;

  /// Get status text in Spanish
  String get statusText {
    switch (status) {
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
    DateTime? createdAt,
    DateTime? updatedAt,
    MatchTeamInfo? homeTeam,
    MatchTeamInfo? awayTeam,
    String? tournamentName,
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
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      homeTeam: homeTeam ?? this.homeTeam,
      awayTeam: awayTeam ?? this.awayTeam,
      tournamentName: tournamentName ?? this.tournamentName,
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
