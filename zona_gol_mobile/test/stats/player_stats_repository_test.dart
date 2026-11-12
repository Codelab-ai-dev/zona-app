import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zona_gol_mobile/core/errors/failures.dart';
import 'package:zona_gol_mobile/core/network/api_client.dart';
import 'package:zona_gol_mobile/core/network/token_store.dart';
import 'package:zona_gol_mobile/data/mappers/player_stats_mapper.dart';
import 'package:zona_gol_mobile/data/repositories/player_stats_repository_impl.dart';
import 'package:zona_gol_mobile/domain/entities/player_stats_entity.dart';
import 'package:zona_gol_mobile/domain/usecases/get_discipline_by_league_usecase.dart';
import 'package:zona_gol_mobile/domain/usecases/get_player_match_history_usecase.dart';
import 'package:zona_gol_mobile/domain/usecases/get_player_stats_by_id_usecase.dart';
import 'package:zona_gol_mobile/domain/usecases/get_player_stats_by_team_usecase.dart';
import 'package:zona_gol_mobile/domain/usecases/get_top_scorers_by_league_usecase.dart';
import 'package:zona_gol_mobile/presentation/bloc/player_stats/player_stats_bloc.dart';
import 'package:zona_gol_mobile/presentation/bloc/player_stats/player_stats_event.dart';
import 'package:zona_gol_mobile/presentation/bloc/player_stats/player_stats_state.dart';

class MemoryStore implements KeyValueStore {
  final values = <String, String>{};
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async => values[key] = value;
  @override
  Future<void> delete(String key) async => values.remove(key);
}

http.Response json(Object body, [int status = 200]) =>
    http.Response.bytes(utf8.encode(jsonEncode(body)), status, headers: {'content-type': 'application/json'});

http.Response list(List<Object> items) => json({
      'data': items,
      'page': {'limit': items.length, 'offset': 0}
    });

// Shapes copied from the live API.
const scorer = {
  'player_id': 'p1',
  'player_name': 'Raúl Rivera',
  'jersey_number': 7,
  'position': 'Delantero',
  'team_id': 't1',
  'team_name': 'Tigres del Norte',
  'matches_played': 3,
  'goals': 5,
  'assists': 1,
  'yellow_cards': 2,
  'red_cards': 0,
  'minutes_played': 270,
};

const teamRow = {
  'player_id': 'p1',
  'name': 'Raúl Rivera',
  'jersey_number': 7,
  'position': 'Delantero',
  'matches_played': 3,
  'goals': 5,
  'assists': 0,
  'yellow_cards': 0,
  'red_cards': 0,
  'minutes_played': 270,
};

Map<String, Object?> historyRow(String id, String date, {required bool isHome}) => {
      'id': id,
      'tournament_id': 'tr1',
      'match_date': date,
      'match_time': '20:00',
      'round': 3,
      'status': 'finished',
      'home_team_id': 'h',
      'home_team_name': 'Halcones United',
      'away_team_id': 'a',
      'away_team_name': 'Tigres del Norte',
      'home_score': 3,
      'away_score': 2,
      'is_home': isHome,
      'goals': 1,
      'assists': 0,
      'yellow_cards': 0,
      'red_cards': 0,
      'minutes_played': 90,
    };

void main() {
  late List<http.Request> requests;

  PlayerStatsRepositoryImpl repo(Future<http.Response> Function(http.Request) handler) {
    requests = [];
    final api = ApiClient(
      baseUrl: 'http://api.test',
      tokens: TokenStore(MemoryStore()),
      httpClient: MockClient((req) {
        requests.add(req);
        return handler(req);
      }),
    );
    return PlayerStatsRepositoryImpl(api: api);
  }

  group('mapper', () {
    test('reads a league totals row', () {
      final s = PlayerStatsMapper.fromJson(Map<String, dynamic>.from(scorer));
      expect(s.playerId, 'p1');
      expect(s.playerName, 'Raúl Rivera');
      expect(s.jerseyNumber, 7);
      expect(s.teamName, 'Tigres del Norte');
      expect(s.goals, 5);
      expect(s.yellowCards, 2);
      expect(s.minutesPlayed, 270);
      expect(s.photo, isNull);
    });

    test('team rows use name and take the team from the request', () {
      final s = PlayerStatsMapper.fromJson(Map<String, dynamic>.from(teamRow), teamId: 't9');
      expect(s.playerName, 'Raúl Rivera');
      expect(s.teamId, 't9');
      expect(s.teamName, isNull);
    });

    test('history keeps the calendar date and picks the opponent', () {
      final away = PlayerStatsMapper.historyFromJson(historyRow('m1', '2026-11-01T00:00:00Z', isHome: false));
      expect(away.matchDate, DateTime(2026, 11, 1));
      expect(away.opponentName, 'Halcones United');
      expect(away.result, 'L');
      final home = PlayerStatsMapper.historyFromJson(historyRow('m2', '2026-10-25', isHome: true));
      expect(home.opponentName, 'Tigres del Norte');
      expect(home.result, 'W');
    });

    test('manual stats body has only the request fields', () {
      const m = ManualStatsEntity(playerId: 'p1', playerName: 'X', goals: 2, assists: 1, yellowCards: 1);
      expect(PlayerStatsMapper.manualToJson(m), {'goals': 2, 'assists': 1, 'yellow_cards': 1, 'red_cards': 0});
    });
  });

  group('repository', () {
    test('top scorers and discipline read the league endpoints with a limit', () async {
      final r = repo((req) async => list([scorer]));
      final scorers = await r.getTopScorersByLeague('L1', limit: 10);
      expect(scorers.getOrElse(() => []).single.goals, 5);
      expect(requests.last.url.path, '/api/v1/leagues/L1/top-scorers');
      expect(requests.last.url.queryParameters['limit'], '10');

      await r.getDisciplineByLeague('L1');
      expect(requests.last.url.path, '/api/v1/leagues/L1/discipline');
      expect(requests.last.url.queryParameters['limit'], '20');
    });

    test('team stats pass tournament_id when given', () async {
      final r = repo((req) async => list([teamRow]));
      final stats = await r.getStatsByTeam('T1', tournamentId: 'TR1');
      expect(stats.getOrElse(() => []).single.teamId, 'T1');
      expect(requests.single.url.path, '/api/v1/teams/T1/player-stats');
      expect(requests.single.url.queryParameters['tournament_id'], 'TR1');

      await r.getStatsByTeam('T1');
      expect(requests.last.url.queryParameters.containsKey('tournament_id'), isFalse);
    });

    test('player stats: totals, null when empty or not found', () async {
      var body = json(scorer);
      final r = repo((req) async => body);
      expect((await r.getStatsByPlayer('p1')).getOrElse(() => null)?.goals, 5);
      expect(requests.single.url.path, '/api/v1/players/p1/stats');

      body = json({...scorer, 'matches_played': 0, 'goals': 0, 'assists': 0, 'yellow_cards': 0});
      expect((await r.getStatsByPlayer('p1')).getOrElse(() => scorerEntity), isNull);

      body = json({'error': {'code': 'not_found', 'message': 'No encontrado'}}, 404);
      expect((await r.getStatsByPlayer('p1')).getOrElse(() => scorerEntity), isNull);
    });

    test('match history pages and sorts newest first', () async {
      final r = repo((req) async => list([
            historyRow('old', '2026-10-18T00:00:00Z', isHome: true),
            historyRow('new', '2026-11-01T00:00:00Z', isHome: false),
          ]));
      final history = (await r.getMatchHistoryByPlayer('p1')).getOrElse(() => []);
      expect(history.map((h) => h.matchId), ['new', 'old']);
      expect(requests.single.url.path, '/api/v1/players/p1/matches');
      expect(requests.single.url.queryParameters['limit'], '100');
    });

    test('active suspensions keep status=active with matches remaining', () async {
      final r = repo((req) async => list([
            {'player_id': 'a', 'status': 'active', 'reason': 'Roja', 'matches_to_serve': 2, 'matches_served': 1},
            {'player_id': 'b', 'status': 'completed', 'matches_to_serve': 1, 'matches_served': 1},
            {'player_id': 'c', 'status': 'cancelled', 'matches_to_serve': 3, 'matches_served': 0},
            {'player_id': 'd', 'status': 'active', 'matches_to_serve': 1, 'matches_served': 1},
          ]));
      final map = (await r.getActiveSuspensionsByLeague('L1')).getOrElse(() => {});
      expect(map.keys, ['a']);
      expect(map['a']!.matchesRemaining, 1);
      expect(requests.single.url.path, '/api/v1/leagues/L1/suspensions');
    });

    test('manual stats: list and PUT absolute values', () async {
      final r = repo((req) async => req.method == 'PUT'
          ? http.Response('', 204)
          : list([
              {'player_id': 'p1', 'player_name': 'X', 'jersey_number': 9, 'team_id': 't1', 'team_name': 'T', 'goals': 2, 'assists': 1, 'yellow_cards': 1, 'red_cards': 0}
            ]));
      final entries = (await r.getManualStats('TR1')).getOrElse(() => []);
      expect(entries.single.goals, 2);
      expect(entries.single.yellowCards, 1);
      expect(requests.single.url.path, '/api/v1/tournaments/TR1/manual-stats');

      final res = await r.setManualStats('TR1', entries.single.copyWith(goals: 4));
      expect(res.isRight(), isTrue);
      expect(requests.last.method, 'PUT');
      expect(requests.last.url.path, '/api/v1/tournaments/TR1/players/p1/manual-stats');
      expect(jsonDecode(requests.last.body), {'goals': 4, 'assists': 1, 'yellow_cards': 1, 'red_cards': 0});
    });

    test('errors become failures', () async {
      final r = repo((req) async => json({'error': {'code': 'forbidden', 'message': 'No'}}, 403));
      final res = await r.getManualStats('TR1');
      expect(res.fold((f) => f, (_) => null), isA<PermissionFailure>());
    });
  });

  group('bloc manual goals', () {
    PlayerStatsBloc bloc(PlayerStatsRepositoryImpl r) => PlayerStatsBloc(
          getPlayerStatsByTeamUseCase: GetPlayerStatsByTeamUseCase(r),
          getTopScorersByLeagueUseCase: GetTopScorersByLeagueUseCase(r),
          getDisciplineByLeagueUseCase: GetDisciplineByLeagueUseCase(r),
          getPlayerStatsByIdUseCase: GetPlayerStatsByIdUseCase(r),
          getPlayerMatchHistoryUseCase: GetPlayerMatchHistoryUseCase(r),
          playerStatsRepository: r,
        );

    Future<http.Response> server(http.Request req) async {
      if (req.method == 'PUT') return http.Response('', 204);
      if (req.url.path.endsWith('/manual-stats')) {
        return list([
          {'player_id': 'p1', 'player_name': 'X', 'team_id': 't1', 'goals': 2, 'assists': 1, 'yellow_cards': 1, 'red_cards': 1}
        ]);
      }
      return list([scorer]);
    }

    test('add sums onto the current manual entry and keeps its cards', () async {
      final b = bloc(repo(server));
      final states = <PlayerStatsState>[];
      final sub = b.stream.listen(states.add);
      b.add(const AddExtemporaneousGoalsEvent(playerId: 'p1', leagueId: 'L1', tournamentId: 'TR1', goals: 3, assists: 0));
      await b.stream.firstWhere((s) => s is TopScorersLoaded);
      final put = requests.firstWhere((r) => r.method == 'PUT');
      expect(jsonDecode(put.body), {'goals': 5, 'assists': 1, 'yellow_cards': 1, 'red_cards': 1});
      expect(states.whereType<ExtemporaneousGoalsSaved>(), hasLength(1));
      await sub.cancel();
      await b.close();
    });

    test('add for a player without manual stats starts from zero', () async {
      final b = bloc(repo(server));
      b.add(const AddExtemporaneousGoalsEvent(playerId: 'p2', leagueId: 'L1', tournamentId: 'TR1', goals: 1, assists: 2));
      await b.stream.firstWhere((s) => s is TopScorersLoaded);
      final put = requests.firstWhere((r) => r.method == 'PUT');
      expect(put.url.path, '/api/v1/tournaments/TR1/players/p2/manual-stats');
      expect(jsonDecode(put.body), {'goals': 1, 'assists': 2, 'yellow_cards': 0, 'red_cards': 0});
      await b.close();
    });

    test('update sets absolute values; delete zeroes goals and assists only', () async {
      final b = bloc(repo(server));
      b.add(const UpdateExtemporaneousGoalsEvent(playerId: 'p1', leagueId: 'L1', tournamentId: 'TR1', goals: 7, assists: 0));
      await b.stream.firstWhere((s) => s is TopScorersLoaded);
      expect(jsonDecode(requests.lastWhere((r) => r.method == 'PUT').body),
          {'goals': 7, 'assists': 0, 'yellow_cards': 1, 'red_cards': 1});

      b.add(const DeleteExtemporaneousGoalsEvent(playerId: 'p1', leagueId: 'L1', tournamentId: 'TR1'));
      await b.stream.firstWhere((s) => s is ExtemporaneousGoalsDeleted);
      await b.stream.firstWhere((s) => s is TopScorersLoaded);
      expect(jsonDecode(requests.lastWhere((r) => r.method == 'PUT').body),
          {'goals': 0, 'assists': 0, 'yellow_cards': 1, 'red_cards': 1});
      await b.close();
    });
  });
}

const scorerEntity = PlayerStatsEntity(playerId: 'x', playerName: 'x', teamId: 't');
