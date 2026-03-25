import 'package:equatable/equatable.dart';

/// A single match entry in a player's match history
class PlayerMatchHistoryEntry extends Equatable {
  final String matchId;
  final DateTime matchDate;
  final String opponentName;
  final bool isHome;
  final int homeScore;
  final int awayScore;
  final int goals;
  final int assists;
  final int yellowCards;
  final int redCards;
  final int minutesPlayed;

  const PlayerMatchHistoryEntry({
    required this.matchId,
    required this.matchDate,
    required this.opponentName,
    required this.isHome,
    required this.homeScore,
    required this.awayScore,
    this.goals = 0,
    this.assists = 0,
    this.yellowCards = 0,
    this.redCards = 0,
    this.minutesPlayed = 0,
  });

  /// W, D, or L from this player's team perspective
  String get result {
    final teamScore = isHome ? homeScore : awayScore;
    final opponentScore = isHome ? awayScore : homeScore;
    if (teamScore > opponentScore) return 'W';
    if (teamScore < opponentScore) return 'L';
    return 'D';
  }

  /// Goals + assists
  int get totalContributions => goals + assists;

  /// Score display like "2 - 1"
  String get scoreDisplay => '$homeScore - $awayScore';

  @override
  List<Object?> get props => [
        matchId,
        matchDate,
        opponentName,
        isHome,
        homeScore,
        awayScore,
        goals,
        assists,
        yellowCards,
        redCards,
        minutesPlayed,
      ];
}
