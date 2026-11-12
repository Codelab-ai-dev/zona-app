import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zona_gol_mobile/core/errors/failures.dart';
import 'package:zona_gol_mobile/core/network/api_client.dart';
import 'package:zona_gol_mobile/core/network/token_store.dart';
import 'package:zona_gol_mobile/data/mappers/league_mapper.dart';
import 'package:zona_gol_mobile/data/mappers/tournament_mapper.dart';
import 'package:zona_gol_mobile/data/repositories/league_repository_impl.dart';
import 'package:zona_gol_mobile/data/repositories/tournament_repository_impl.dart';
import 'package:zona_gol_mobile/data/repositories/user_admin_repository_impl.dart';
import 'package:zona_gol_mobile/domain/entities/tournament_entity.dart';

class MemoryStore implements KeyValueStore {
  final values = <String, String>{};
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async => values[key] = value;
  @override
  Future<void> delete(String key) async => values.remove(key);
}

http.Response json(Object? body, [int status = 200]) => body == null
    ? http.Response('', status)
    : http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json; charset=utf-8'});

Map<String, dynamic> page(List<Object> data) => {
      'data': data,
      'page': {'limit': 100, 'offset': 0, 'total': data.length},
    };

// Shapes copied from the live API (GET /leagues/admin, /leagues/{id}/tournaments,
// /leagues/{id}/stats, /admin/stats, /users).
const leagueId = '62749413-4725-4100-a14f-9dc5fd47cb2e';
final leagueJson = {
  'id': leagueId,
  'name': 'Liga Demo Zona Gol',
  'slug': 'liga-demo',
  'description': 'Liga de demostración para desarrollo local',
  'admin_id': '0d4944cb-e2f7-4af6-b867-d04d24b6e223',
  'is_active': true,
  'product_mode': 'full',
  'features': {'finance': true, 'ai_agent': true, 'qr_codes': true, 'mobile_app': true},
  'created_at': '2026-11-08T02:29:00.294599Z',
  'updated_at': '2026-11-08T03:50:50.605969Z',
};
final tournamentJson = {
  'id': '1cd5a549-ba87-4119-99f9-c2b1721ab3e3',
  'name': 'Apertura 2026',
  'league_id': leagueId,
  'start_date': '2026-10-18',
  'end_date': '2027-01-18',
  'is_active': true,
  'max_players': 20,
  'registration_open': true,
  'max_coaching_staff': 10,
  'tournament_format': 'league',
  'teams_advancing_per_group': 2,
  'rounds_per_season': 1,
  'has_third_place_match': false,
  'age_validation_enabled': false,
  'age_exception_count': 0,
  'id_document_required': false,
  'created_at': '2026-11-08T02:29:00.294599Z',
  'updated_at': '2026-11-08T02:29:00.294599Z',
};
final statsJson = {
  'teams': 6,
  'players': 48,
  'matches': 15,
  'finished_matches': 9,
  'goals': 25,
  'yellow_cards': 0,
  'red_cards': 0,
  'top_scorer': {
    'player_id': '57c1b191-d5f8-4954-ab01-4f5ab9b8a542',
    'player_name': 'Raúl Rivera',
    'jersey_number': 7,
    'position': 'Delantero',
    'team_id': '539e7793-9ddd-42fd-ab83-931dd073d2f5',
    'team_name': 'Tigres del Norte',
    'matches_played': 3,
    'goals': 5,
    'assists': 0,
    'yellow_cards': 0,
    'red_cards': 0,
    'minutes_played': 270,
  },
  'upcoming_matches': [
    {
      'id': '01acd332-6a7e-44cd-86e7-c850629a0251',
      'tournament_id': '1cd5a549-ba87-4119-99f9-c2b1721ab3e3',
      'match_date': '2026-11-15T00:00:00Z',
      'match_time': '16:00',
      'round': 5,
      'status': 'scheduled',
      'home_team_id': 'bcbe2bf5-afab-491c-95ef-13ec7fbbf046',
      'home_team_name': 'Águilas FC',
      'away_team_id': '539e7793-9ddd-42fd-ab83-931dd073d2f5',
      'away_team_name': 'Tigres del Norte',
      'home_score': 0,
      'away_score': 0,
    },
  ],
  'matches_per_month': [
    {'month': '2026-10', 'matches': 6},
    {'month': '2026-11', 'matches': 3},
  ],
};
final adminStatsJson = {
  'leagues': {'total': 2, 'active': 1},
  'tournaments': {'total': 1, 'active': 1},
  'teams': {'total': 6, 'active': 6},
  'players': {'total': 48, 'active': 47},
  'users': {'total': 3, 'active': 3},
  'league_admins': 1,
  'team_owners': 1,
  'matches': {'total': 15, 'finished': 9, 'this_month': 3},
  'goals_this_month': 10,
  'top_scorers': [
    {
      'player_id': '57c1b191-d5f8-4954-ab01-4f5ab9b8a542',
      'player_name': 'Raúl Rivera',
      'team_name': 'Tigres del Norte',
      'league_name': 'Liga Demo Zona Gol',
      'goals': 5,
    },
  ],
  'recent_matches': [
    {
      'id': '0984af4e-0b8c-4666-b97e-5560b33e8760',
      'match_date': '2026-11-01T00:00:00Z',
      'league_name': 'Liga Demo Zona Gol',
      'home_team_name': 'Halcones United',
      'away_team_name': 'Tigres del Norte',
      'home_score': 3,
      'away_score': 2,
    },
  ],
};


void main() {
  late List<http.Request> requests;
  late Future<http.Response> Function(http.Request) handler;
  late ApiClient api;

  setUp(() async {
    requests = [];
    final tokens = TokenStore(MemoryStore());
    await tokens.save(access: 'a', refresh: 'r', expiresAt: DateTime.now().add(const Duration(hours: 1)));
    api = ApiClient(
      baseUrl: 'http://api.test',
      tokens: tokens,
      httpClient: MockClient((req) {
        requests.add(req);
        return handler(req);
      }),
    );
  });

  Map<String, dynamic> body(http.Request r) => jsonDecode(r.body) as Map<String, dynamic>;
  String route(http.Request r) => '${r.method} ${r.url.path.replaceFirst('/api/v1', '')}';

  group('mappers', () {
    test('league from the live JSON', () {
      final l = LeagueMapper.fromJson(leagueJson);
      expect(l.id, leagueId);
      expect(l.slug, 'liga-demo');
      expect(l.adminId, '0d4944cb-e2f7-4af6-b867-d04d24b6e223');
      expect(l.productMode, 'full');
      expect(l.hasFeature('finance'), isTrue);
      expect(l.hasFeature('finances'), isFalse);
      expect(l.logo, isNull);
      expect(l.createdAt, isNotNull);
    });

    test('tournament from the live JSON; dates are local calendar days', () {
      final t = TournamentMapper.fromJson(tournamentJson);
      expect(t.startDate, DateTime(2026, 10, 18));
      expect(t.endDate, DateTime(2027, 1, 18));
      expect(t.format, TournamentFormat.league);
      expect(t.maxPlayers, 20);
      expect(t.isActive, isTrue);
      expect(t.numberOfGroups, isNull);
    });

    test('tournament create body only has CreateTournamentRequest fields', () {
      final b = TournamentMapper.createJson(
        name: 'Clausura',
        leagueId: leagueId,
        startDate: DateTime(2027, 2, 1),
        endDate: DateTime(2027, 5, 30),
        format: TournamentFormat.groupKnockout,
        numberOfGroups: 4,
      );
      expect(b['start_date'], '2027-02-01');
      expect(b['tournament_format'], 'group_knockout');
      expect(b['number_of_groups'], 4);
      expect(b['is_active'], false);
      const allowed = {
        'league_id', 'name', 'start_date', 'end_date', 'is_active', 'max_players', 'registration_open',
        'max_coaching_staff', 'tournament_format', 'number_of_groups', 'teams_advancing_per_group',
        'rounds_per_season', 'has_third_place_match', 'age_validation_enabled', 'min_age', 'max_age',
        'age_reference_date', 'age_exception_count', 'age_exception_min_age', 'age_exception_max_age',
        'id_document_required',
      };
      expect(allowed.containsAll(b.keys), isTrue);
    });

    test('league stats from the live JSON', () {
      final s = LeagueStatsMapper.fromJson(
        {
          ...statsJson,
          'scheduled_matches': 1,
          'matches_this_month': 3,
          'goals_this_month': 7,
          'results': {'home_wins': 1, 'draws': 1, 'away_wins': 1},
        },
        now: DateTime(2026, 11, 12),
      );
      expect(s.teamsCount, 6);
      expect(s.playersCount, 48);
      expect(s.matchesPlayed, 9);
      expect(s.totalGoals, 25);
      expect(s.matchesPending, 1);
      expect(s.matchesThisMonth, 3);
      expect(s.goalsThisMonth, 7);
      expect(s.resultDistribution.homeWins, 1);
      expect(s.resultDistribution.draws, 1);
      expect(s.resultDistribution.awayWins, 1);
      expect(s.monthlyMatches.map((m) => m.month), ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov']);
      expect(s.monthlyMatches.map((m) => m.count), [0, 0, 0, 0, 6, 3]);
      expect(s.upcomingMatches.single.homeName, 'Águilas FC');
      // UTC midnight stays the same calendar day in any time zone.
      expect(s.upcomingMatches.single.matchDate, DateTime(2026, 11, 15));
      expect(s.topScorer!.playerName, 'Raúl Rivera');
      expect(s.topScorer!.goals, 5);
    });

    test('global stats from the live JSON', () {
      final g = LeagueStatsMapper.globalFromJson(adminStatsJson);
      expect(g.leagues, 2);
      expect(g.activeLeagues, 1);
      expect(g.activePlayers, 47);
      expect(g.users, 3);
      expect(g.matches, 15);
      expect(g.matchesThisMonth, 3);
      expect(g.goalsThisMonth, 10);
      expect(g.topScorers.single.leagueName, 'Liga Demo Zona Gol');
      expect(g.recentMatches.single.homeScore, 3);
      expect(g.recentMatches.single.matchDate, DateTime(2026, 11, 1));
    });
  });

  group('LeagueRepositoryImpl', () {
    test('active leagues come from /leagues, all of them from /leagues/admin', () async {
      handler = (req) async => json(page([leagueJson]));
      final repo = LeagueRepositoryImpl(api: api);
      final active = await repo.getAllLeagues(onlyActive: true);
      final all = await repo.getAllLeagues();
      expect(active.getOrElse(() => []).single.name, 'Liga Demo Zona Gol');
      expect(all.isRight(), isTrue);
      expect(requests.map(route), ['GET /leagues', 'GET /leagues/admin']);
      expect(requests.first.url.queryParameters['limit'], '100');
    });

    test('createLeague posts, links the admin and sets a non-default plan', () async {
      handler = (req) async {
        switch (route(req)) {
          case 'POST /leagues':
            return json({...leagueJson, 'product_mode': 'full'}, 201);
          case 'PUT /leagues/$leagueId/admin':
            return json(null, 204);
          case 'PATCH /leagues/$leagueId/product-mode':
            return json({...leagueJson, 'product_mode': 'web_only'});
        }
        return json({'error': {'code': 'not_found', 'message': 'x'}}, 404);
      };
      final r = await LeagueRepositoryImpl(api: api).createLeague(
        name: 'Liga',
        slug: 'liga',
        description: 'Una liga de prueba',
        adminId: 'admin-1',
        productMode: 'web_only',
      );
      expect(r.getOrElse(() => throw 'fail').productMode, 'web_only');
      expect(requests.map(route), [
        'POST /leagues',
        'PUT /leagues/$leagueId/admin',
        'PATCH /leagues/$leagueId/product-mode',
      ]);
      expect(body(requests[0]), {'name': 'Liga', 'slug': 'liga', 'description': 'Una liga de prueba', 'admin_id': 'admin-1'});
      expect(body(requests[1]), {'admin_id': 'admin-1'});
      expect(body(requests[2]), {'product_mode': 'web_only'});
    });

    test('createLeague with the default plan skips product-mode; 409 is a taken slug', () async {
      handler = (req) async =>
          route(req) == 'POST /leagues' ? json(leagueJson, 201) : json(null, 204);
      final repo = LeagueRepositoryImpl(api: api);
      await repo.createLeague(name: 'Liga', slug: 'liga', description: 'Una liga de prueba', adminId: 'a');
      expect(requests.map(route), ['POST /leagues', 'PUT /leagues/$leagueId/admin']);

      handler = (req) async => json({'error': {'code': 'conflict', 'message': 'Conflicto'}}, 409);
      final r = await repo.createLeague(name: 'Liga', slug: 'liga', description: 'Una liga de prueba', adminId: 'a');
      final f = r.fold((f) => f, (_) => null);
      expect(f, isA<ValidationFailure>());
      expect(f!.message, contains('slug'));
    });

    test('updateLeague patches fields and the status separately', () async {
      handler = (req) async => json(leagueJson);
      final repo = LeagueRepositoryImpl(api: api);
      await repo.updateLeague(leagueId: leagueId, name: 'Nueva');
      await repo.updateLeague(leagueId: leagueId, isActive: false);
      expect(requests.map(route), ['PATCH /leagues/$leagueId', 'PATCH /leagues/$leagueId/status']);
      expect(body(requests[0]), {'name': 'Nueva'});
      expect(body(requests[1]), {'is_active': false});
    });

    test('deleteLeague is a DELETE', () async {
      handler = (req) async => json(null, 204);
      final r = await LeagueRepositoryImpl(api: api).deleteLeague(leagueId);
      expect(r.isRight(), isTrue);
      expect(route(requests.single), 'DELETE /leagues/$leagueId');
    });

    test('getLeagueStats is one request to /leagues/{id}/stats', () async {
      final calls = <String>[];
      handler = (req) async {
        calls.add(route(req));
        return json({...statsJson, 'scheduled_matches': 2, 'results': {'home_wins': 4, 'draws': 0, 'away_wins': 5}});
      };
      final s = (await LeagueRepositoryImpl(api: api).getLeagueStats(leagueId)).getOrElse(() => throw 'fail');
      expect(calls, ['GET /leagues/$leagueId/stats']);
      expect(s.resultDistribution.homeWins, 4);
      expect(s.matchesPending, 2);
    });

    test('getGlobalStats reads /admin/stats; 403 is a PermissionFailure', () async {
      handler = (req) async => json(adminStatsJson);
      final repo = LeagueRepositoryImpl(api: api);
      expect((await repo.getGlobalStats()).isRight(), isTrue);
      expect(route(requests.single), 'GET /admin/stats');
      handler = (req) async => json({'error': {'code': 'forbidden', 'message': 'x'}}, 403);
      expect((await repo.getGlobalStats()).fold((f) => f, (_) => null), isA<PermissionFailure>());
    });
  });

  group('TournamentRepositoryImpl', () {
    test('lists by league, newest first, and filters active', () async {
      handler = (req) async => json(page([
            {...tournamentJson, 'id': 't1', 'start_date': '2026-01-10', 'is_active': false},
            {...tournamentJson, 'id': 't2'},
          ]));
      final repo = TournamentRepositoryImpl(api: api);
      final all = (await repo.getTournamentsByLeagueId(leagueId)).getOrElse(() => []);
      expect(all.map((t) => t.id), ['t2', 't1']);
      final active = (await repo.getTournamentsByLeagueId(leagueId, onlyActive: true)).getOrElse(() => []);
      expect(active.map((t) => t.id), ['t2']);
      expect(route(requests.first), 'GET /leagues/$leagueId/tournaments');
    });

    test('getTournamentById 404 is NotFoundFailure', () async {
      handler = (req) async => json({'error': {'code': 'not_found', 'message': 'x'}}, 404);
      final r = await TournamentRepositoryImpl(api: api).getTournamentById('x');
      expect(r.fold((f) => f, (_) => null), isA<NotFoundFailure>());
    });

    test('createTournament posts the request body', () async {
      handler = (req) async => json(tournamentJson, 201);
      final r = await TournamentRepositoryImpl(api: api).createTournament(
        name: 'Apertura 2026',
        leagueId: leagueId,
        startDate: DateTime(2026, 10, 18),
        endDate: DateTime(2027, 1, 18),
        maxPlayers: 20,
      );
      expect(r.getOrElse(() => throw 'fail').name, 'Apertura 2026');
      expect(route(requests.single), 'POST /tournaments');
      expect(body(requests.single)['end_date'], '2027-01-18');
      expect(body(requests.single)['league_id'], leagueId);
    });
  });

  group('UserAdminRepositoryImpl', () {
    test('getUsers reads league_name and team_name', () async {
      handler = (req) async => json(page([
            {
              'id': 'u1',
              'name': 'Dueño de Equipo',
              'email': 'equipo@zonagol.local',
              'role': 'team_owner',
              'league_id': leagueId,
              'team_id': 'bcbe2bf5-afab-491c-95ef-13ec7fbbf046',
              'is_active': true,
              'created_at': '2026-11-08T02:29:00.294599Z',
              'league_name': 'Liga Demo Zona Gol',
              'team_name': 'Águilas FC',
            },
            {'id': 'u2', 'name': 'Super Admin', 'email': 's@x', 'role': 'super_admin', 'is_active': true},
          ]));
      final users = (await UserAdminRepositoryImpl(api: api).getUsers()).getOrElse(() => []);
      expect(users.first.teamName, 'Águilas FC');
      expect(users.first.leagueName, 'Liga Demo Zona Gol');
      expect(users.last.leagueName, isNull);
      expect(route(requests.single), 'GET /users');
    });

    test('createUser and updateUser bodies', () async {
      handler = (req) async => json({'id': 'u9', 'name': 'Admin', 'email': 'a@b.mx', 'role': 'league_admin', 'is_active': true});
      final repo = UserAdminRepositoryImpl(api: api);
      await repo.createUser(email: 'a@b.mx', password: 'Abcdef123!xy', name: 'Admin', role: 'league_admin');
      await repo.updateUser('u9', role: 'public');
      expect(route(requests[0]), 'POST /admin/users');
      expect(body(requests[0]), {'email': 'a@b.mx', 'password': 'Abcdef123!xy', 'name': 'Admin', 'role': 'league_admin'});
      expect(route(requests[1]), 'PATCH /admin/users/u9');
      expect(body(requests[1]), {'role': 'public'});

      handler = (req) async => json({'error': {'code': 'conflict', 'message': 'x'}}, 409);
      final f = (await repo.createUser(email: 'a@b.mx', password: 'Abcdef123!xy', name: 'A', role: 'league_admin'))
          .fold((f) => f, (_) => null);
      expect(f!.message, contains('email'));
    });
  });
}
