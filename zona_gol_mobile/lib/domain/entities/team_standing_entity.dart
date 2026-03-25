import 'package:equatable/equatable.dart';

/// Team Standing Entity
/// Represents a team's position in the tournament standings
class TeamStandingEntity extends Equatable {
  final String id;
  final String teamId;
  final String? leagueId;
  final String? tournamentId;

  // Team info
  final String teamName;
  final String? teamLogo;

  // Match statistics
  final int matchesPlayed;
  final int matchesWon;
  final int matchesDrawn;
  final int matchesLost;

  // Goals
  final int goalsFor;
  final int goalsAgainst;
  final int goalDifference;

  // Points
  final int points;
  final int pointsAdjustment;
  final String? adjustmentReason;

  // Group info (for group_knockout tournaments)
  final String? groupName;

  // Additional stats
  final int? cleanSheets;
  final int? yellowCards;
  final int? redCards;
  final String? recentForm;

  const TeamStandingEntity({
    required this.id,
    required this.teamId,
    this.leagueId,
    this.tournamentId,
    required this.teamName,
    this.teamLogo,
    this.groupName,
    this.matchesPlayed = 0,
    this.matchesWon = 0,
    this.matchesDrawn = 0,
    this.matchesLost = 0,
    this.goalsFor = 0,
    this.goalsAgainst = 0,
    this.goalDifference = 0,
    this.points = 0,
    this.pointsAdjustment = 0,
    this.adjustmentReason,
    this.cleanSheets,
    this.yellowCards,
    this.redCards,
    this.recentForm,
  });

  /// Total points including adjustments
  int get totalPoints => points + pointsAdjustment;

  /// Whether the team has a point adjustment
  bool get hasAdjustment => pointsAdjustment != 0;

  /// Short form labels for display
  static const String labelPJ = 'PJ'; // Partidos Jugados
  static const String labelPG = 'PG'; // Partidos Ganados
  static const String labelPE = 'PE'; // Partidos Empatados
  static const String labelPP = 'PP'; // Partidos Perdidos
  static const String labelGF = 'GF'; // Goles a Favor
  static const String labelGC = 'GC'; // Goles en Contra
  static const String labelDG = 'DG'; // Diferencia de Goles
  static const String labelPTS = 'PTS'; // Puntos

  @override
  List<Object?> get props => [
        id,
        teamId,
        leagueId,
        tournamentId,
        teamName,
        teamLogo,
        groupName,
        matchesPlayed,
        matchesWon,
        matchesDrawn,
        matchesLost,
        goalsFor,
        goalsAgainst,
        goalDifference,
        points,
        pointsAdjustment,
        adjustmentReason,
        cleanSheets,
        yellowCards,
        redCards,
        recentForm,
      ];
}
