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

/// Platform-wide top scorer (`GET /admin/stats`).
class GlobalScorerInfo extends Equatable {
  final String playerId;
  final String playerName;
  final String teamName;
  final String leagueName;
  final int goals;

  const GlobalScorerInfo({
    required this.playerId,
    required this.playerName,
    required this.teamName,
    required this.leagueName,
    required this.goals,
  });

  @override
  List<Object?> get props => [playerId, playerName, teamName, leagueName, goals];
}

/// Recently finished match (`GET /admin/stats`).
class RecentMatchInfo extends Equatable {
  final String id;
  final DateTime? matchDate;
  final String leagueName;
  final String homeName;
  final String awayName;
  final int homeScore;
  final int awayScore;

  const RecentMatchInfo({
    required this.id,
    required this.matchDate,
    required this.leagueName,
    required this.homeName,
    required this.awayName,
    required this.homeScore,
    required this.awayScore,
  });

  @override
  List<Object?> get props => [id, matchDate, leagueName, homeName, awayName, homeScore, awayScore];
}

/// Platform statistics for the super admin (`GET /admin/stats`).
class GlobalStatsEntity extends Equatable {
  final int leagues;
  final int activeLeagues;
  final int tournaments;
  final int activeTournaments;
  final int teams;
  final int activeTeams;
  final int players;
  final int activePlayers;
  final int users;
  final int activeUsers;
  final int leagueAdmins;
  final int teamOwners;
  final int matches;
  final int finishedMatches;
  final int matchesThisMonth;
  final int goalsThisMonth;
  final List<GlobalScorerInfo> topScorers;
  final List<RecentMatchInfo> recentMatches;

  const GlobalStatsEntity({
    this.leagues = 0,
    this.activeLeagues = 0,
    this.tournaments = 0,
    this.activeTournaments = 0,
    this.teams = 0,
    this.activeTeams = 0,
    this.players = 0,
    this.activePlayers = 0,
    this.users = 0,
    this.activeUsers = 0,
    this.leagueAdmins = 0,
    this.teamOwners = 0,
    this.matches = 0,
    this.finishedMatches = 0,
    this.matchesThisMonth = 0,
    this.goalsThisMonth = 0,
    this.topScorers = const [],
    this.recentMatches = const [],
  });

  @override
  List<Object?> get props => [
        leagues,
        activeLeagues,
        tournaments,
        activeTournaments,
        teams,
        activeTeams,
        players,
        activePlayers,
        users,
        activeUsers,
        leagueAdmins,
        teamOwners,
        matches,
        finishedMatches,
        matchesThisMonth,
        goalsThisMonth,
        topScorers,
        recentMatches,
      ];
}
