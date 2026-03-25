import 'package:equatable/equatable.dart';

/// Upcoming match info for league stats
class UpcomingMatchInfo extends Equatable {
  final String id;
  final String homeName;
  final String awayName;
  final DateTime matchDate;

  const UpcomingMatchInfo({
    required this.id,
    required this.homeName,
    required this.awayName,
    required this.matchDate,
  });

  @override
  List<Object?> get props => [id, homeName, awayName, matchDate];
}

/// Top scorer info
class TopScorerInfo extends Equatable {
  final String playerName;
  final String teamName;
  final int goals;

  const TopScorerInfo({
    required this.playerName,
    required this.teamName,
    required this.goals,
  });

  @override
  List<Object?> get props => [playerName, teamName, goals];
}

/// Result distribution (home wins / draws / away wins)
class ResultDistribution extends Equatable {
  final int homeWins;
  final int draws;
  final int awayWins;

  const ResultDistribution({
    required this.homeWins,
    required this.draws,
    required this.awayWins,
  });

  @override
  List<Object?> get props => [homeWins, draws, awayWins];
}

/// Monthly match count for bar chart
class MonthlyMatchData extends Equatable {
  final String month;
  final int count;

  const MonthlyMatchData({required this.month, required this.count});

  @override
  List<Object?> get props => [month, count];
}

/// League Statistics Entity
class LeagueStatsEntity extends Equatable {
  final int teamsCount;
  final int playersCount;
  final int matchesPlayed;
  final int matchesPending;
  final int totalGoals;
  final int totalYellowCards;
  final int totalRedCards;
  final int matchesThisMonth;
  final int goalsThisMonth;
  final ResultDistribution resultDistribution;
  final List<MonthlyMatchData> monthlyMatches;
  final List<UpcomingMatchInfo> upcomingMatches;
  final TopScorerInfo? topScorer;

  const LeagueStatsEntity({
    required this.teamsCount,
    required this.playersCount,
    required this.matchesPlayed,
    required this.matchesPending,
    required this.totalGoals,
    required this.totalYellowCards,
    required this.totalRedCards,
    required this.matchesThisMonth,
    required this.goalsThisMonth,
    required this.resultDistribution,
    required this.monthlyMatches,
    required this.upcomingMatches,
    this.topScorer,
  });

  double get avgGoalsPerMatch =>
      matchesPlayed > 0 ? totalGoals / matchesPlayed : 0.0;

  double get avgCardsPerMatch =>
      matchesPlayed > 0
          ? (totalYellowCards + totalRedCards) / matchesPlayed
          : 0.0;

  @override
  List<Object?> get props => [
        teamsCount,
        playersCount,
        matchesPlayed,
        matchesPending,
        totalGoals,
        totalYellowCards,
        totalRedCards,
        matchesThisMonth,
        goalsThisMonth,
        resultDistribution,
        monthlyMatches,
        upcomingMatches,
        topScorer,
      ];
}
