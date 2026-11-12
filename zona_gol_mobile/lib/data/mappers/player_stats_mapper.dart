import '../../core/network/json.dart';
import '../../domain/entities/player_match_history_entity.dart';
import '../../domain/entities/player_stats_entity.dart';

/// Maps the Go API's player stats shapes.
class PlayerStatsMapper {
  PlayerStatsMapper._();

  /// A player totals row: `/leagues/{id}/top-scorers`, `/leagues/{id}/discipline`,
  /// `/players/{id}/stats`, and `/teams/{id}/player-stats` (which uses `name`
  /// and omits the team, so [teamId] fills it).
  static PlayerStatsEntity fromJson(Map<String, dynamic> json, {String? teamId}) {
    return PlayerStatsEntity(
      playerId: json.str('player_id'),
      playerName: json.strOrNull('player_name') ?? json.str('name'),
      jerseyNumber: json.intOrNull('jersey_number'),
      position: json.strOrNull('position'),
      photo: json.strOrNull('photo'),
      teamId: json.strOrNull('team_id') ?? teamId ?? '',
      teamName: json.strOrNull('team_name'),
      matchesPlayed: json.integer('matches_played'),
      goals: json.integer('goals'),
      assists: json.integer('assists'),
      yellowCards: json.integer('yellow_cards'),
      redCards: json.integer('red_cards'),
      minutesPlayed: json.integer('minutes_played'),
    );
  }

  /// A row of `GET /players/{id}/matches`.
  static PlayerMatchHistoryEntry historyFromJson(Map<String, dynamic> json) {
    final isHome = json.boolean('is_home');
    return PlayerMatchHistoryEntry(
      matchId: json.str('id'),
      matchDate: _calendarDate(json.strOrNull('match_date')) ?? DateTime(2000),
      opponentName: isHome ? json.str('away_team_name') : json.str('home_team_name'),
      isHome: isHome,
      homeScore: json.integer('home_score'),
      awayScore: json.integer('away_score'),
      goals: json.integer('goals'),
      assists: json.integer('assists'),
      yellowCards: json.integer('yellow_cards'),
      redCards: json.integer('red_cards'),
      minutesPlayed: json.integer('minutes_played'),
    );
  }

  /// A row of `GET /tournaments/{id}/manual-stats`.
  static ManualStatsEntity manualFromJson(Map<String, dynamic> json) {
    return ManualStatsEntity(
      playerId: json.str('player_id'),
      playerName: json.str('player_name'),
      jerseyNumber: json.intOrNull('jersey_number'),
      teamId: json.str('team_id'),
      teamName: json.strOrNull('team_name'),
      goals: json.integer('goals'),
      assists: json.integer('assists'),
      yellowCards: json.integer('yellow_cards'),
      redCards: json.integer('red_cards'),
    );
  }

  /// Body of `PUT /tournaments/{tid}/players/{pid}/manual-stats`.
  static Map<String, dynamic> manualToJson(ManualStatsEntity stats) => {
        'goals': stats.goals,
        'assists': stats.assists,
        'yellow_cards': stats.yellowCards,
        'red_cards': stats.redCards,
      };

  /// A row of `GET /leagues/{id}/suspensions`.
  static SuspensionInfo suspensionFromJson(Map<String, dynamic> json) {
    return SuspensionInfo(
      playerId: json.str('player_id'),
      reason: json.strOrNull('reason'),
      matchesToServe: json.integer('matches_to_serve'),
      matchesServed: json.integer('matches_served'),
    );
  }

  /// `match_date` is a calendar date sent as `YYYY-MM-DD` or as midnight UTC
  /// (`2026-11-01T00:00:00Z`); converting the latter to local time would
  /// move it to the previous day west of UTC.
  static DateTime? _calendarDate(String? value) {
    if (value == null || value.length < 10) return null;
    final p = value.substring(0, 10).split('-');
    if (p.length != 3) return null;
    final y = int.tryParse(p[0]), m = int.tryParse(p[1]), d = int.tryParse(p[2]);
    if (y == null || m == null || d == null) return null;
    return DateTime(y, m, d);
  }
}
