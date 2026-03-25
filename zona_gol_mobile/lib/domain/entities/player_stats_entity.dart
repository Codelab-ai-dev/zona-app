import 'package:equatable/equatable.dart';

/// Aggregated player statistics entity
/// Represents accumulated stats for a player across matches
class PlayerStatsEntity extends Equatable {
  final String playerId;
  final String playerName;
  final int? jerseyNumber;
  final String? position;
  final String? photo;
  final String teamId;
  final String? teamName;
  final int matchesPlayed;
  final int goals;
  final int assists;
  final int yellowCards;
  final int redCards;
  final int minutesPlayed;

  const PlayerStatsEntity({
    required this.playerId,
    required this.playerName,
    this.jerseyNumber,
    this.position,
    this.photo,
    required this.teamId,
    this.teamName,
    this.matchesPlayed = 0,
    this.goals = 0,
    this.assists = 0,
    this.yellowCards = 0,
    this.redCards = 0,
    this.minutesPlayed = 0,
  });

  @override
  List<Object?> get props => [
        playerId,
        playerName,
        jerseyNumber,
        position,
        photo,
        teamId,
        teamName,
        matchesPlayed,
        goals,
        assists,
        yellowCards,
        redCards,
        minutesPlayed,
      ];

  // Computed stats
  double get goalsPerMatch =>
      matchesPlayed == 0 ? 0.0 : goals / matchesPlayed;

  double get assistsPerMatch =>
      matchesPlayed == 0 ? 0.0 : assists / matchesPlayed;

  int get totalContributions => goals + assists;

  double get minutesPerGoal =>
      goals == 0 ? 0.0 : minutesPlayed / goals;

  int get averageMinutesPerMatch =>
      matchesPlayed == 0 ? 0 : (minutesPlayed / matchesPlayed).round();

  int get disciplineScore => (yellowCards * 1) + (redCards * 3);

  // Display helpers
  String get displayName {
    if (jerseyNumber != null) return '#$jerseyNumber $playerName';
    return playerName;
  }

  String get statsDisplay => '$goals G, $assists A';

  String get cardDisplay {
    if (yellowCards == 0 && redCards == 0) return 'Sin tarjetas';
    if (redCards > 0) return '$yellowCards TA, $redCards TR';
    return '$yellowCards TA';
  }

  String get positionDisplay {
    if (position == null || position!.isEmpty) return 'N/A';
    const positionMap = {
      'GK': 'POR',
      'DEF': 'DEF',
      'MID': 'MED',
      'FWD': 'DEL',
      'goalkeeper': 'POR',
      'defender': 'DEF',
      'midfielder': 'MED',
      'forward': 'DEL',
    };
    return positionMap[position] ?? position!;
  }

  String get initials {
    final parts = playerName.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return playerName.isNotEmpty ? playerName[0].toUpperCase() : '?';
  }

  bool get hasPhoto => photo != null && photo!.isNotEmpty;

  int get totalCards => yellowCards + redCards;
}

/// Suspension info for a player
class SuspensionInfo {
  final String playerId;
  final String? reason;
  final int matchesToServe;
  final int matchesServed;

  const SuspensionInfo({
    required this.playerId,
    this.reason,
    required this.matchesToServe,
    required this.matchesServed,
  });

  int get matchesRemaining => matchesToServe - matchesServed;
  bool get isActive => matchesRemaining > 0;
}
