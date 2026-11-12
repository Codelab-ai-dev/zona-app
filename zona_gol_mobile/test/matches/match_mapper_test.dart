import 'package:flutter_test/flutter_test.dart';
import 'package:zona_gol_mobile/data/mappers/match_mapper.dart';
import 'package:zona_gol_mobile/domain/entities/match_entity.dart';
import 'package:zona_gol_mobile/domain/repositories/match_repository.dart';

/// Shapes copied from the live API (GET /tournaments/{id}/matches, GET /matches/{id}).
const listRow = {
  'id': '8eb16eed-f95e-4713-b983-3177de2d373f',
  'tournament_id': '1cd5a549-ba87-4119-99f9-c2b1721ab3e3',
  'home_team_id': 'a6480a61-6173-4cde-ae89-3d72de76385c',
  'away_team_id': 'bcbe2bf5-afab-491c-95ef-13ec7fbbf046',
  'home_score': 0,
  'away_score': 0,
  'match_date': '2026-11-08T00:00:00Z',
  'match_time': '16:00:00.000000',
  'status': 'scheduled',
  'round': 4,
  'field_number': 1,
  'phase': 'regular',
  'is_published': true,
  'created_at': '2026-11-08T02:29:00.294599Z',
  'updated_at': '2026-11-08T02:29:00.294599Z',
  'home_team_name': 'Real Colonia',
  'away_team_name': 'Águilas FC',
};

const detail = {
  'id': 'ff33c556-0834-45ca-bdf6-72c52135f608',
  'tournament_id': '1cd5a549-ba87-4119-99f9-c2b1721ab3e3',
  'home_team_id': 'bcbe2bf5-afab-491c-95ef-13ec7fbbf046',
  'away_team_id': '9da60998-dda1-42ce-8339-e7507ef09af2',
  'home_score': 1,
  'away_score': 0,
  'match_date': '2026-10-18T00:00:00Z',
  'match_time': '16:00:00.000000',
  'status': 'finished',
  'round': 1,
  'field_number': 1,
  'phase': 'regular',
  'is_published': true,
  'home_team_name': 'Águilas FC',
  'away_team_name': 'Halcones United',
  'home_team': {'id': 'bcbe2bf5-afab-491c-95ef-13ec7fbbf046', 'name': 'Águilas FC', 'slug': 'equipo-1', 'logo': ''},
  'away_team': {
    'id': '9da60998-dda1-42ce-8339-e7507ef09af2',
    'name': 'Halcones United',
    'slug': 'equipo-6',
    'logo': 'https://cdn.test/h.png'
  },
  'goals': [
    {
      'id': 'e3c3d891-a3a9-4d74-9ce7-1e892c4808dd',
      'match_id': 'ff33c556-0834-45ca-bdf6-72c52135f608',
      'player_id': '819181db-064a-4b04-b72f-b6a66865b464',
      'team_id': 'bcbe2bf5-afab-491c-95ef-13ec7fbbf046',
      'minute': 15,
      'goal_type': 'penalty',
      'assist_player_id': 'a1',
      'assist_player_name': 'Luis',
      'player_name': 'Raúl Ramírez',
      'player_jersey': 7,
    }
  ],
  'cards': [
    {
      'id': 'c1',
      'player_id': 'p9',
      'team_id': '9da60998-dda1-42ce-8339-e7507ef09af2',
      'card_type': 'red',
      'minute': 80,
      'player_name': 'Pedro',
      'player_jersey': 4,
    }
  ],
};

void main() {
  group('MatchMapper.fromJson', () {
    test('reads a list row with flat team names', () {
      final m = MatchMapper.fromJson(Map<String, dynamic>.from(listRow));
      expect(m.id, listRow['id']);
      expect(m.homeTeam?.name, 'Real Colonia');
      expect(m.awayTeam?.name, 'Águilas FC');
      expect(m.homeTeam?.logo, isNull);
      expect(m.matchTime, '16:00');
      expect(m.round, 4);
      expect(m.fieldNumber, 1);
      expect(m.status, MatchStatus.scheduled);
      expect(m.isPublished, isTrue);
      // A scheduled match has no result even though the API sends 0-0.
      expect(m.hasResult, isFalse);
      expect(m.goals, isEmpty);
    });

    test('keeps the calendar day of match_date regardless of time zone', () {
      final m = MatchMapper.fromJson(Map<String, dynamic>.from(listRow));
      expect(m.matchDate, DateTime(2026, 11, 8));
    });

    test('reads the detail with nested teams, goals and cards', () {
      final m = MatchMapper.fromJson(Map<String, dynamic>.from(detail));
      expect(m.hasResult, isTrue);
      expect(m.resultText, '1 - 0');
      expect(m.homeTeam?.slug, 'equipo-1');
      expect(m.homeTeam?.logo, isNull); // empty logo
      expect(m.awayTeam?.logo, 'https://cdn.test/h.png');

      final g = m.goals.single;
      expect(g.minute, 15);
      expect(g.goalType, GoalType.penalty);
      expect(g.playerName, 'Raúl Ramírez');
      expect(g.playerJersey, 7);
      expect(g.assistPlayerId, 'a1');
      expect(g.assistPlayerName, 'Luis');

      final c = m.cards.single;
      expect(c.cardType, CardType.red);
      expect(c.minute, 80);
      expect(c.teamId, detail['away_team_id']);
    });

    test('reads playoff fields and dry-run rows without id', () {
      final m = MatchMapper.fromJson({
        'tournament_id': 't1',
        'home_team_id': 'h',
        'away_team_id': 'a',
        'match_date': '2026-12-05T00:00:00Z',
        'match_time': '09:30',
        'round': 2,
        'field_number': 3,
        'bye_team_id': 'b',
        'phase': 'playoffs',
        'playoff_round': 'third_place',
        'playoff_position': 1,
        'leg': 'second',
      });
      expect(m.id, '');
      expect(m.byeTeamId, 'b');
      expect(m.phase, MatchPhase.playoffs);
      expect(m.playoffRound, PlayoffRound.thirdPlace);
      expect(m.leg, MatchLeg.second);
      expect(m.matchTime, '09:30');
      expect(m.status, MatchStatus.scheduled);
    });
  });

  group('request bodies', () {
    test('new match only has CreateMatchRequest fields and an RFC 3339 date', () {
      final body = MatchMapper.newMatchToJson(NewMatch(
        tournamentId: 't1',
        homeTeamId: 'h',
        awayTeamId: 'a',
        matchDate: DateTime(2026, 3, 7),
        matchTime: '18:00',
        fieldNumber: 2,
        round: 5,
      ));
      expect(body, {
        'tournament_id': 't1',
        'home_team_id': 'h',
        'away_team_id': 'a',
        'match_date': '2026-03-07T00:00:00Z',
        'match_time': '18:00',
        'field_number': 2,
        'round': 5,
        'phase': 'regular',
      });
    });

    test('playoff match includes playoff fields', () {
      final body = MatchMapper.newMatchToJson(NewMatch(
        tournamentId: 't1',
        homeTeamId: 'h',
        awayTeamId: 'a',
        matchDate: DateTime(2026, 3, 7),
        phase: MatchPhase.playoffs,
        playoffRound: PlayoffRound.final_,
        playoffPosition: 1,
        leg: MatchLeg.first,
      ));
      expect(body['phase'], 'playoffs');
      expect(body['playoff_round'], 'final');
      expect(body['playoff_position'], 1);
      expect(body['leg'], 'first');
    });

    test('schedule update only sends the changed fields', () {
      expect(
        MatchMapper.scheduleUpdateToJson(MatchScheduleUpdate(
          matchDate: DateTime(2026, 1, 2),
          fieldNumber: 3,
        )),
        {'match_date': '2026-01-02T00:00:00Z', 'field_number': 3},
      );
    });

    test('result sorts events by minute and omits empty assist/observations', () {
      final body = MatchMapper.resultToJson(const MatchResultInput(
        homeScore: 2,
        awayScore: 1,
        goals: [
          MatchGoal(playerId: 'p2', teamId: 'h', minute: 70, assistPlayerId: 'p3'),
          MatchGoal(playerId: 'p1', teamId: 'a', minute: 10, goalType: GoalType.ownGoal),
        ],
        cards: [
          MatchCard(playerId: 'p5', teamId: 'a', cardType: CardType.red, minute: 90),
          MatchCard(playerId: 'p4', teamId: 'h', cardType: CardType.yellow, minute: 30),
        ],
        observations: '   ',
      ));
      expect(body, {
        'home_score': 2,
        'away_score': 1,
        'goals': [
          {'player_id': 'p1', 'team_id': 'a', 'minute': 10, 'goal_type': 'own_goal'},
          {'player_id': 'p2', 'team_id': 'h', 'minute': 70, 'goal_type': 'normal', 'assist_player_id': 'p3'},
        ],
        'cards': [
          {'player_id': 'p4', 'team_id': 'h', 'card_type': 'yellow', 'minute': 30},
          {'player_id': 'p5', 'team_id': 'a', 'card_type': 'red', 'minute': 90},
        ],
      });
    });

    test('fixture request maps weekdays and uses groups when present', () {
      final schedule = FixtureSchedule(
        startDate: DateTime(2026, 2, 1),
        endDate: DateTime(2026, 5, 1),
        matchDays: const [7, 6],
        startTime: '08:00',
        fieldsAvailable: 2,
      );
      final plain = MatchMapper.fixtureRequestToJson(FixtureRequest(
        tournamentId: 't1',
        teams: const [FixtureTeam(id: 'a', name: 'A'), FixtureTeam(id: 'b', name: 'B')],
        schedule: schedule,
        dryRun: true,
      ));
      expect(plain['teams'], [
        {'id': 'a', 'name': 'A'},
        {'id': 'b', 'name': 'B'},
      ]);
      expect(plain.containsKey('groups'), isFalse);
      expect(plain['dry_run'], isTrue);
      expect(plain['is_double_round'], isFalse);
      expect(plain['schedule'], {
        'start_date': '2026-02-01',
        'end_date': '2026-05-01',
        'match_days': ['saturday', 'sunday'],
        'start_time': '08:00',
        'fields_available': 2,
        'half_minutes': 25,
        'halftime_break_minutes': 10,
        'break_between_matches': 5,
      });

      final grouped = MatchMapper.fixtureRequestToJson(FixtureRequest(
        tournamentId: 't1',
        groups: const {
          'A': [FixtureTeam(id: 'a', name: 'A'), FixtureTeam(id: 'b', name: 'B')],
        },
        isDoubleRound: true,
        schedule: schedule,
      ));
      expect(grouped.containsKey('teams'), isFalse);
      expect(grouped.containsKey('dry_run'), isFalse);
      expect(grouped['groups'], [
        {
          'name': 'A',
          'teams': [
            {'id': 'a', 'name': 'A'},
            {'id': 'b', 'name': 'B'},
          ],
        }
      ]);
    });

    test('playoff request', () {
      expect(
        MatchMapper.playoffRequestToJson(PlayoffRequest(
          tournamentId: 't1',
          numTeams: 4,
          startDate: DateTime(2026, 6, 1),
          startTime: '18:00',
          fieldNumber: 1,
          thirdPlaceMatch: true,
          teamIds: const ['a', 'b', 'c', 'd'],
        )),
        {
          'tournament_id': 't1',
          'num_teams': 4,
          'start_date': '2026-06-01T00:00:00Z',
          'start_time': '18:00',
          'field_number': 1,
          'third_place_match': true,
          'home_and_away': false,
          'team_ids': ['a', 'b', 'c', 'd'],
        },
      );
    });
  });
}
