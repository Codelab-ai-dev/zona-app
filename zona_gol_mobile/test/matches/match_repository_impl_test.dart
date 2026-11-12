import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zona_gol_mobile/core/errors/failures.dart';
import 'package:zona_gol_mobile/core/network/api_client.dart';
import 'package:zona_gol_mobile/core/network/token_store.dart';
import 'package:zona_gol_mobile/data/repositories/match_repository_impl.dart';
import 'package:zona_gol_mobile/domain/entities/match_entity.dart';
import 'package:zona_gol_mobile/domain/repositories/match_repository.dart';
import 'package:zona_gol_mobile/domain/usecases/update_match_result_usecase.dart';

class MemoryStore implements KeyValueStore {
  final values = <String, String>{};
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async => values[key] = value;
  @override
  Future<void> delete(String key) async => values.remove(key);
}

http.Response json(Object? body, [int status = 200]) =>
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

http.Response apiError(int status, String code) =>
    json({'error': {'code': code, 'message': 'error', 'fields': {}}}, status);

Map<String, dynamic> row(String id, {int round = 1, String status = 'scheduled', String tournament = 't1'}) => {
      'id': id,
      'tournament_id': tournament,
      'home_team_id': 'h',
      'away_team_id': 'a',
      'home_score': 2,
      'away_score': 1,
      'match_date': '2026-11-08T00:00:00Z',
      'match_time': '16:00:00',
      'status': status,
      'round': round,
      'phase': 'regular',
      'is_published': false,
      'home_team_name': 'Local',
      'away_team_name': 'Visita',
    };

void main() {
  late List<http.Request> requests;
  late Future<http.Response> Function(http.Request) handler;
  late MatchRepositoryImpl repo;

  setUp(() async {
    requests = [];
    final tokens = TokenStore(MemoryStore());
    await tokens.save(
      access: 'tok',
      refresh: 'r',
      expiresAt: DateTime.now().add(const Duration(hours: 1)),
    );
    final api = ApiClient(
      baseUrl: 'http://api.test',
      tokens: tokens,
      httpClient: MockClient((req) {
        requests.add(req);
        return handler(req);
      }),
    );
    repo = MatchRepositoryImpl(api: api);
  });

  Map<String, dynamic> body(http.Request r) => jsonDecode(r.body) as Map<String, dynamic>;

  test('pending matches come with their tournament names', () async {
    handler = (req) async {
      if (req.url.path.endsWith('/matches/pending')) {
        return json({'data': [row('m1')], 'page': {'limit': 100, 'offset': 0}});
      }
      return json({'data': [{'id': 't1', 'name': 'Apertura'}], 'page': {'limit': 100, 'offset': 0}});
    };
    final result = await repo.getPendingMatchesByLeague('L1');
    final matches = result.getOrElse(() => []);
    expect(requests.first.url.path, '/api/v1/leagues/L1/matches/pending');
    expect(requests.last.url.path, '/api/v1/leagues/L1/tournaments');
    expect(matches.single.tournamentName, 'Apertura');
    expect(matches.single.hasResult, isFalse);
  });

  test('tournament matches paginate, filter and sort by round', () async {
    handler = (req) async {
      final offset = int.parse(req.url.queryParameters['offset']!);
      if (offset == 0) {
        return json({
          'data': List.generate(100, (i) => row('m$i', round: 2)),
          'page': {'limit': 100, 'offset': 0},
        });
      }
      return json({'data': [row('last', round: 1, status: 'finished')], 'page': {'limit': 100, 'offset': 100}});
    };
    final result = await repo.getMatchesByTournament('t1', phase: MatchPhase.regular, round: 2);
    final matches = result.getOrElse(() => []);
    expect(matches.length, 101);
    expect(matches.first.id, 'last');
    expect(matches.first.resultText, '2 - 1');
    expect(requests.first.url.path, '/api/v1/tournaments/t1/matches');
    expect(requests.first.url.queryParameters['phase'], 'regular');
    expect(requests.first.url.queryParameters['round'], '2');
    expect(requests.first.headers['Authorization'], 'Bearer tok');
  });

  test('match detail adds the tournament name', () async {
    handler = (req) async {
      if (req.url.path == '/api/v1/matches/m1') return json(row('m1', status: 'finished'));
      return json({'id': 't1', 'name': 'Clausura'});
    };
    final match = (await repo.getMatchById('m1')).getOrElse(() => throw 'fail');
    expect(match.tournamentName, 'Clausura');
    expect(requests.last.url.path, '/api/v1/tournaments/t1');
  });

  test('a hidden match is a NotFoundFailure', () async {
    handler = (_) async => apiError(404, 'not_found');
    final result = await repo.getMatchById('m1');
    expect(result.fold((f) => f, (_) => null), isA<NotFoundFailure>());
  });

  test('submitMatchResult posts the events model', () async {
    handler = (_) async => http.Response('', 204);
    final result = await repo.submitMatchResult(
      'm1',
      const MatchResultInput(
        homeScore: 1,
        awayScore: 0,
        goals: [MatchGoal(playerId: 'p1', teamId: 'h', minute: 12)],
        observations: 'Todo bien',
      ),
    );
    expect(result.isRight(), isTrue);
    final req = requests.single;
    expect(req.method, 'POST');
    expect(req.url.path, '/api/v1/matches/m1/result');
    expect(body(req), {
      'home_score': 1,
      'away_score': 0,
      'goals': [
        {'player_id': 'p1', 'team_id': 'h', 'minute': 12, 'goal_type': 'normal'}
      ],
      'cards': [],
      'observations': 'Todo bien',
    });
  });

  test('updateMatchStatus patches the status; 409 means already finished', () async {
    handler = (_) async => http.Response('', 204);
    expect((await repo.updateMatchStatus(matchId: 'm1', status: MatchStatus.inProgress)).isRight(), isTrue);
    expect(requests.single.method, 'PATCH');
    expect(requests.single.url.path, '/api/v1/matches/m1/status');
    expect(body(requests.single), {'status': 'in_progress'});

    handler = (_) async => apiError(409, 'conflict');
    final failed = await repo.updateMatchStatus(matchId: 'm1', status: MatchStatus.cancelled);
    expect(failed.fold((f) => f, (_) => null), isA<ValidationFailure>());
  });

  test('publish match and publish round', () async {
    handler = (_) async => http.Response('', 204);
    await repo.setMatchPublished('m1', true);
    await repo.publishRound(tournamentId: 't1', round: 3, isPublished: false);
    expect(requests[0].method, 'PATCH');
    expect(requests[0].url.path, '/api/v1/matches/m1/publish');
    expect(body(requests[0]), {'is_published': true});
    expect(requests[1].method, 'POST');
    expect(requests[1].url.path, '/api/v1/tournaments/t1/rounds/3/publish');
    expect(body(requests[1]), {'is_published': false});
  });

  test('createMatch and bulk createMatches', () async {
    handler = (req) async =>
        req.url.path.endsWith('/bulk') ? json([row('b1'), row('b2')], 201) : json(row('c1'), 201);
    final created = await repo.createMatch(NewMatch(
      tournamentId: 't1',
      homeTeamId: 'h',
      awayTeamId: 'a',
      matchDate: DateTime(2026, 1, 3),
    ));
    expect(created.getOrElse(() => throw 'fail').id, 'c1');
    expect(requests.last.url.path, '/api/v1/matches');

    final bulk = await repo.createMatches('t1', [
      NewMatch(tournamentId: 't1', homeTeamId: 'h', awayTeamId: 'a', matchDate: DateTime(2026, 1, 3), round: 1),
    ]);
    expect(bulk.getOrElse(() => []).length, 2);
    expect(requests.last.url.path, '/api/v1/tournaments/t1/matches/bulk');
    final sent = body(requests.last);
    expect(sent['tournament_id'], 't1');
    expect((sent['matches'] as List).single['round'], 1);
  });

  test('generateFixtures parses the dry run rows', () async {
    handler = (_) async => json({
          'dry_run': true,
          'rounds': 3,
          'matches': [
            {
              'tournament_id': 't1',
              'home_team_id': 'h',
              'away_team_id': 'a',
              'match_date': '2026-02-07T00:00:00Z',
              'match_time': '08:00',
              'field_number': 1,
              'round': 1,
              'bye_team_id': 'x',
            }
          ],
        });
    final result = await repo.generateFixtures(FixtureRequest(
      tournamentId: 't1',
      teams: const [FixtureTeam(id: 'h', name: 'H'), FixtureTeam(id: 'a', name: 'A')],
      schedule: FixtureSchedule(startDate: DateTime(2026, 2, 7), matchDays: const [6], startTime: '08:00'),
      dryRun: true,
    ));
    final generated = result.getOrElse(() => throw 'fail');
    expect(generated.rounds, 3);
    expect(generated.matches.single.byeTeamId, 'x');
    expect(generated.matches.single.matchDate, DateTime(2026, 2, 7));
    expect(requests.single.url.path, '/api/v1/tournaments/t1/fixtures/generate');
    expect(body(requests.single)['dry_run'], isTrue);
  });

  test('generatePlayoffs returns the created matches', () async {
    handler = (_) async => json([row('p1'), row('p2')], 201);
    final result = await repo.generatePlayoffs(PlayoffRequest(
      tournamentId: 't1',
      numTeams: 4,
      startDate: DateTime(2026, 6, 1),
      startTime: '18:00',
      fieldNumber: 1,
    ));
    expect(result.getOrElse(() => []).length, 2);
    expect(requests.single.url.path, '/api/v1/tournaments/t1/playoffs/generate');
  });

  test('updateMatchSchedule patches the schedule', () async {
    handler = (_) async => json(row('m1'));
    final result = await repo.updateMatchSchedule('m1', const MatchScheduleUpdate(matchTime: '10:00'));
    expect(result.isRight(), isTrue);
    expect(requests.single.method, 'PATCH');
    expect(requests.single.url.path, '/api/v1/matches/m1/schedule');
    expect(body(requests.single), {'match_time': '10:00'});
  });

  test('deleteMatches deletes one by one and stops on a 409', () async {
    handler = (req) async =>
        req.url.path.endsWith('/m2') ? apiError(409, 'conflict') : http.Response('', 204);
    final result = await repo.deleteMatches(['m1', 'm2', 'm3']);
    expect(result.fold((f) => f, (_) => null), isA<ValidationFailure>());
    expect(requests.map((r) => '${r.method} ${r.url.path}'), [
      'DELETE /api/v1/matches/m1',
      'DELETE /api/v1/matches/m2',
    ]);
  });

  test('referee report: observations, and 404 means none', () async {
    handler = (_) async => json({'id': 'r', 'match_id': 'm1', 'general_observations': 'Lluvia'});
    expect((await repo.getRefereeReport('m1')).getOrElse(() => 'x'), 'Lluvia');
    handler = (_) async => apiError(404, 'not_found');
    expect((await repo.getRefereeReport('m1')).getOrElse(() => 'x'), isNull);
  });

  test('network errors become NetworkFailure', () async {
    handler = (_) async => throw http.ClientException('offline');
    final result = await repo.getMatchesByTournament('t1');
    expect(result.fold((f) => f, (_) => null), isA<NetworkFailure>());
  });

  group('UpdateMatchResultUseCase.validate', () {
    MatchResultInput input(int home, int away, List<MatchGoal> goals, [List<MatchCard> cards = const []]) =>
        MatchResultInput(homeScore: home, awayScore: away, goals: goals, cards: cards);

    test('accepts fewer goals than the score', () {
      expect(UpdateMatchResultUseCase.validate(input(2, 0, const []), 'h', 'a'), isNull);
    });

    test('an own goal counts for the rival', () {
      const ownGoal = MatchGoal(playerId: 'p', teamId: 'h', minute: 5, goalType: GoalType.ownGoal);
      expect(UpdateMatchResultUseCase.validate(input(0, 1, const [ownGoal]), 'h', 'a'), isNull);
      expect(UpdateMatchResultUseCase.validate(input(1, 0, const [ownGoal]), 'h', 'a'), isNotNull);
    });

    test('rejects minutes outside 1..120 and negative scores', () {
      const late = MatchCard(playerId: 'p', teamId: 'h', cardType: CardType.yellow, minute: 121);
      expect(UpdateMatchResultUseCase.validate(input(0, 0, const [], const [late]), 'h', 'a'), isNotNull);
      expect(UpdateMatchResultUseCase.validate(input(-1, 0, const []), 'h', 'a'), isNotNull);
    });
  });
}
