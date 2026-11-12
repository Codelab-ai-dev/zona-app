import '../../core/network/json.dart';
import '../../domain/entities/match_entity.dart';
import '../../domain/repositories/match_repository.dart';

/// Match Mapper
/// Converts Go API match JSON (`Match`, `MatchWithRelations` and the dry-run
/// `CreateMatchRequest` rows) to entities, and entities to request bodies.
class MatchMapper {
  MatchMapper._();

  /// Convert API JSON to MatchEntity
  static MatchEntity fromJson(Map<String, dynamic> json) {
    final status = json.str('status', 'scheduled').toMatchStatus();
    // The API stores 0-0 until a result is posted; only a finished match has one.
    final finished = status == MatchStatus.finished;

    return MatchEntity(
      id: json.str('id'),
      tournamentId: json.str('tournament_id'),
      homeTeamId: json.str('home_team_id'),
      awayTeamId: json.str('away_team_id'),
      homeScore: finished ? json.integer('home_score') : null,
      awayScore: finished ? json.integer('away_score') : null,
      matchDate: calendarDate(json.strOrNull('match_date')) ?? DateTime.now(),
      matchTime: clock(json.strOrNull('match_time')),
      fieldNumber: json.intOrNull('field_number'),
      round: json.intOrNull('round'),
      status: status,
      phase: json.str('phase', 'regular').toMatchPhase(),
      playoffRound: json.strOrNull('playoff_round')?.toPlayoffRound(),
      playoffPosition: json.intOrNull('playoff_position'),
      leg: json.strOrNull('leg')?.toMatchLeg(),
      isPublished: json.boolean('is_published'),
      byeTeamId: json.strOrNull('bye_team_id'),
      createdAt: json.dateOrNull('created_at'),
      updatedAt: json.dateOrNull('updated_at'),
      homeTeam: _team(json, 'home'),
      awayTeam: _team(json, 'away'),
      goals: json.objList('goals').map(goalFromJson).toList(),
      cards: json.objList('cards').map(cardFromJson).toList(),
    );
  }

  /// Team info from the nested `home_team` object (detail) or the flat
  /// `home_team_name` / `home_team_logo` fields (lists).
  static MatchTeamInfo? _team(Map<String, dynamic> json, String side) {
    final nested = json.objOrNull('${side}_team');
    final id = nested?.strOrNull('id') ?? json.strOrNull('${side}_team_id');
    final name = nested?.strOrNull('name') ?? json.strOrNull('${side}_team_name');
    if (id == null || name == null || name.isEmpty) return null;
    final logo = nested?.strOrNull('logo') ?? json.strOrNull('${side}_team_logo');
    return MatchTeamInfo(
      id: id,
      name: name,
      logo: (logo == null || logo.isEmpty) ? null : logo,
      slug: nested?.strOrNull('slug'),
    );
  }

  static MatchGoal goalFromJson(Map<String, dynamic> json) => MatchGoal(
        id: json.strOrNull('id'),
        playerId: json.str('player_id'),
        teamId: json.str('team_id'),
        minute: json.integer('minute'),
        goalType: GoalTypeX.fromApi(json.strOrNull('goal_type')),
        assistPlayerId: json.strOrNull('assist_player_id'),
        playerName: json.strOrNull('player_name'),
        playerJersey: json.intOrNull('player_jersey'),
        assistPlayerName: json.strOrNull('assist_player_name'),
      );

  static MatchCard cardFromJson(Map<String, dynamic> json) => MatchCard(
        id: json.strOrNull('id'),
        playerId: json.str('player_id'),
        teamId: json.str('team_id'),
        cardType: CardTypeX.fromApi(json.strOrNull('card_type')),
        minute: json.integer('minute'),
        playerName: json.strOrNull('player_name'),
        playerJersey: json.intOrNull('player_jersey'),
      );

  /// `match_date` comes as RFC 3339 at midnight UTC (or a bare date): keep the
  /// calendar day as a local date so it never shifts with the time zone.
  static DateTime? calendarDate(String? value) {
    if (value == null || value.length < 10) return null;
    final p = value.substring(0, 10).split('-');
    if (p.length != 3) return null;
    final y = int.tryParse(p[0]), m = int.tryParse(p[1]), d = int.tryParse(p[2]);
    if (y == null || m == null || d == null) return null;
    return DateTime(y, m, d);
  }

  /// `16:00:00.000000` -> `16:00`
  static String? clock(String? value) {
    if (value == null || value.isEmpty) return null;
    final p = value.split(':');
    if (p.length < 2) return value;
    return '${p[0].padLeft(2, '0')}:${p[1].padLeft(2, '0')}';
  }

  /// Dates for `time.Time` request fields (RFC 3339, midnight UTC of the day).
  static String apiDateTime(DateTime d) => '${apiDate(d)}T00:00:00Z';

  static String phaseToApi(MatchPhase phase) =>
      phase == MatchPhase.playoffs ? 'playoffs' : 'regular';

  static const _weekdays = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'sunday',
  };

  // ==================== Request bodies ====================

  /// `CreateMatchRequest`
  static Map<String, dynamic> newMatchToJson(NewMatch m) => {
        'tournament_id': m.tournamentId,
        'home_team_id': m.homeTeamId,
        'away_team_id': m.awayTeamId,
        'match_date': apiDateTime(m.matchDate),
        if (m.matchTime != null) 'match_time': m.matchTime,
        if (m.fieldNumber != null) 'field_number': m.fieldNumber,
        if (m.round != null) 'round': m.round,
        'phase': phaseToApi(m.phase),
        if (m.playoffRound != null) 'playoff_round': m.playoffRound!.toDbString(),
        if (m.playoffPosition != null) 'playoff_position': m.playoffPosition,
        if (m.leg != null) 'leg': m.leg!.name,
      };

  /// `UpdateMatchScheduleRequest`
  static Map<String, dynamic> scheduleUpdateToJson(MatchScheduleUpdate u) => {
        if (u.matchDate != null) 'match_date': apiDateTime(u.matchDate!),
        if (u.matchTime != null) 'match_time': u.matchTime,
        if (u.fieldNumber != null) 'field_number': u.fieldNumber,
        if (u.round != null) 'round': u.round,
        if (u.homeTeamId != null) 'home_team_id': u.homeTeamId,
        if (u.awayTeamId != null) 'away_team_id': u.awayTeamId,
      };

  /// `PostMatchResultRequest`. Events go in ascending minute order (the API
  /// rejects unordered lists).
  static Map<String, dynamic> resultToJson(MatchResultInput r) {
    final goals = [...r.goals]..sort((a, b) => a.minute.compareTo(b.minute));
    final cards = [...r.cards]..sort((a, b) => a.minute.compareTo(b.minute));
    final observations = r.observations?.trim();
    return {
      'home_score': r.homeScore,
      'away_score': r.awayScore,
      'goals': goals
          .map((g) => {
                'player_id': g.playerId,
                'team_id': g.teamId,
                'minute': g.minute,
                'goal_type': g.goalType.toApiString(),
                if (g.assistPlayerId != null && g.assistPlayerId!.isNotEmpty)
                  'assist_player_id': g.assistPlayerId,
              })
          .toList(),
      'cards': cards
          .map((c) => {
                'player_id': c.playerId,
                'team_id': c.teamId,
                'card_type': c.cardType.toApiString(),
                'minute': c.minute,
              })
          .toList(),
      if (observations != null && observations.isNotEmpty) 'observations': observations,
    };
  }

  /// `GenerateFixturesRequest`
  static Map<String, dynamic> fixtureRequestToJson(FixtureRequest r) {
    List<Map<String, dynamic>> teams(List<FixtureTeam> list) =>
        list.map((t) => {'id': t.id, 'name': t.name}).toList();
    final s = r.schedule;
    final days = [...s.matchDays]..sort();
    return {
      'tournament_id': r.tournamentId,
      if (r.groups.isEmpty) 'teams': teams(r.teams),
      if (r.groups.isNotEmpty)
        'groups': r.groups.entries
            .map((e) => {'name': e.key, 'teams': teams(e.value)})
            .toList(),
      'is_double_round': r.isDoubleRound,
      'schedule': {
        'start_date': apiDate(s.startDate),
        if (s.endDate != null) 'end_date': apiDate(s.endDate!),
        'match_days': days.map((d) => _weekdays[d]).whereType<String>().toList(),
        'start_time': s.startTime,
        if (s.endTime != null) 'end_time': s.endTime,
        'fields_available': s.fieldsAvailable,
        'half_minutes': s.halfMinutes,
        'halftime_break_minutes': s.halftimeBreakMinutes,
        'break_between_matches': s.breakBetweenMatches,
      },
      if (r.dryRun) 'dry_run': true,
    };
  }

  /// `GeneratePlayoffsRequest`
  static Map<String, dynamic> playoffRequestToJson(PlayoffRequest r) => {
        'tournament_id': r.tournamentId,
        'num_teams': r.numTeams,
        'start_date': apiDateTime(r.startDate),
        'start_time': r.startTime,
        'field_number': r.fieldNumber,
        'third_place_match': r.thirdPlaceMatch,
        'home_and_away': r.homeAndAway,
        if (r.teamIds.isNotEmpty) 'team_ids': r.teamIds,
      };
}
