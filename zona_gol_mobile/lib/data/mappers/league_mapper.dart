import '../../core/network/json.dart';
import '../../domain/entities/league_entity.dart';
import '../../domain/entities/league_stats_entity.dart';

/// League Mapper: Go API league JSON (`leagues.League`) <-> LeagueEntity.
class LeagueMapper {
  /// From `GET /leagues`, `/leagues/admin`, `/leagues/mine`, `/leagues/{id}`.
  static LeagueEntity fromJson(Map<String, dynamic> json) => LeagueEntity(
        id: json.str('id'),
        name: json.str('name'),
        slug: json.str('slug'),
        description: json.str('description'),
        logo: json.strOrNull('logo'),
        adminId: json.str('admin_id'),
        isActive: json.boolean('is_active', true),
        createdAt: json.dateOrNull('created_at'),
        updatedAt: json.dateOrNull('updated_at'),
        features: json.objOrNull('features'),
        productMode: json.str('product_mode', 'full'),
      );

  /// Body of `POST /leagues` (leagues.CreateLeagueRequest).
  static Map<String, dynamic> createJson({
    required String name,
    required String slug,
    required String description,
    required String adminId,
    String? logo,
  }) =>
      {
        'name': name,
        'slug': slug,
        'description': description,
        if (logo != null && logo.isNotEmpty) 'logo': logo,
        'admin_id': adminId,
      };

  /// Body of `PATCH /leagues/{id}` (leagues.UpdateLeagueRequest).
  static Map<String, dynamic> updateJson({String? name, String? slug, String? description, String? logo}) => {
        if (name != null) 'name': name,
        if (slug != null) 'slug': slug,
        if (description != null) 'description': description,
        if (logo != null) 'logo': logo,
      };
}

/// League statistics mapper (`GET /leagues/{id}/stats`, `GET /admin/stats`).
class LeagueStatsMapper {
  static const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  /// [json] is `leaguedata.LeagueStats` (`GET /leagues/{id}/stats`).
  /// [now] is for tests.
  static LeagueStatsEntity fromJson(Map<String, dynamic> json, {DateTime? now}) {
    final today = now ?? DateTime.now();
    final perMonth = <String, int>{
      for (final m in json.objList('matches_per_month')) m.str('month'): m.integer('matches'),
    };
    final monthly = <MonthlyMatchData>[];
    for (var i = 5; i >= 0; i--) {
      final month = DateTime(today.year, today.month - i, 1);
      monthly.add(MonthlyMatchData(month: monthNames[month.month - 1], count: perMonth[_monthKey(month)] ?? 0));
    }
    final results = json.objOrNull('results') ?? const <String, dynamic>{};

    final top = json.objOrNull('top_scorer');
    return LeagueStatsEntity(
      teamsCount: json.integer('teams'),
      playersCount: json.integer('players'),
      matchesPlayed: json.integer('finished_matches'),
      matchesPending: json.integer('scheduled_matches'),
      totalGoals: json.integer('goals'),
      totalYellowCards: json.integer('yellow_cards'),
      totalRedCards: json.integer('red_cards'),
      matchesThisMonth: json.integer('matches_this_month'),
      goalsThisMonth: json.integer('goals_this_month'),
      resultDistribution: ResultDistribution(
        homeWins: results.integer('home_wins'),
        draws: results.integer('draws'),
        awayWins: results.integer('away_wins'),
      ),
      monthlyMatches: monthly,
      upcomingMatches: json
          .objList('upcoming_matches')
          .take(5)
          .map((m) => UpcomingMatchInfo(
                id: m.str('id'),
                homeName: m.str('home_team_name', 'Local'),
                awayName: m.str('away_team_name', 'Visitante'),
                matchDate: calendarDate(m, 'match_date') ?? today,
              ))
          .toList(),
      topScorer: top == null || top.integer('goals') <= 0
          ? null
          : TopScorerInfo(playerName: top.str('player_name'), teamName: top.str('team_name'), goals: top.integer('goals')),
    );
  }

  /// From `GET /admin/stats` (superadmin.Stats).
  static GlobalStatsEntity globalFromJson(Map<String, dynamic> json) {
    int total(String key) => json.objOrNull(key)?.integer('total') ?? 0;
    int active(String key) => json.objOrNull(key)?.integer('active') ?? 0;
    final matches = json.objOrNull('matches') ?? const <String, dynamic>{};
    return GlobalStatsEntity(
      leagues: total('leagues'),
      activeLeagues: active('leagues'),
      tournaments: total('tournaments'),
      activeTournaments: active('tournaments'),
      teams: total('teams'),
      activeTeams: active('teams'),
      players: total('players'),
      activePlayers: active('players'),
      users: total('users'),
      activeUsers: active('users'),
      leagueAdmins: json.integer('league_admins'),
      teamOwners: json.integer('team_owners'),
      matches: matches.integer('total'),
      finishedMatches: matches.integer('finished'),
      matchesThisMonth: matches.integer('this_month'),
      goalsThisMonth: json.integer('goals_this_month'),
      topScorers: json
          .objList('top_scorers')
          .map((s) => GlobalScorerInfo(
                playerId: s.str('player_id'),
                playerName: s.str('player_name'),
                teamName: s.str('team_name'),
                leagueName: s.str('league_name'),
                goals: s.integer('goals'),
              ))
          .toList(),
      recentMatches: json
          .objList('recent_matches')
          .map((m) => RecentMatchInfo(
                id: m.str('id'),
                matchDate: calendarDate(m, 'match_date'),
                leagueName: m.str('league_name'),
                homeName: m.str('home_team_name', 'Local'),
                awayName: m.str('away_team_name', 'Visitante'),
                homeScore: m.integer('home_score'),
                awayScore: m.integer('away_score'),
              ))
          .toList(),
    );
  }

  /// `match_date` is a calendar date the API sends as `YYYY-MM-DD` or as
  /// UTC midnight (`YYYY-MM-DDT00:00:00Z`); keep the day, not the instant.
  static DateTime? calendarDate(Map<String, dynamic> json, String key) {
    final v = json[key];
    if (v is String && v.length >= 10) {
      final d = DateTime.tryParse(v.substring(0, 10));
      if (d != null) return DateTime(d.year, d.month, d.day);
    }
    return null;
  }

  static String _monthKey(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}';
}
