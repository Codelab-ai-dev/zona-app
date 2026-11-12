import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zona_gol_mobile/core/errors/failures.dart';
import 'package:zona_gol_mobile/core/network/api_client.dart';
import 'package:zona_gol_mobile/core/network/token_store.dart';
import 'package:zona_gol_mobile/data/mappers/coaching_staff_mapper.dart';
import 'package:zona_gol_mobile/data/mappers/player_mapper.dart';
import 'package:zona_gol_mobile/data/mappers/team_mapper.dart';
import 'package:zona_gol_mobile/data/mappers/team_standing_mapper.dart';
import 'package:zona_gol_mobile/data/repositories/coaching_staff_repository_impl.dart';
import 'package:zona_gol_mobile/data/repositories/player_repository_impl.dart';
import 'package:zona_gol_mobile/data/repositories/team_repository_impl.dart';
import 'package:zona_gol_mobile/domain/entities/player_verification_entity.dart';
import 'package:zona_gol_mobile/domain/usecases/update_standings_usecase.dart';

class MemoryStore implements KeyValueStore {
  final values = <String, String>{};
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async => values[key] = value;
  @override
  Future<void> delete(String key) async => values.remove(key);
}

http.Response json(Object? body, [int status = 200]) => http.Response.bytes(
    body == null ? const [] : utf8.encode(jsonEncode(body)), status,
    headers: {'content-type': 'application/json'});

Map<String, dynamic> page(List<Object> data) => {
      'data': data,
      'page': {'limit': 100, 'offset': 0}
    };

const leagueId = '62749413-4725-4100-a14f-9dc5fd47cb2e';
const tournamentId = '1cd5a549-ba87-4119-99f9-c2b1721ab3e3';
const teamId = 'bcbe2bf5-afab-491c-95ef-13ec7fbbf046';
const playerId = 'be3391c6-a1f4-42c8-af21-94dc4830d92d';

// Shapes copied from the live API.
final teamJson = {
  'id': teamId,
  'name': 'Águilas FC',
  'slug': 'equipo-1',
  'league_id': leagueId,
  'tournament_id': tournamentId,
  'owner_id': '63cc1275-a25e-494e-9809-c23e3361add6',
  'is_active': true,
  'created_at': '2026-11-08T02:29:00.294599Z',
  'updated_at': '2026-11-08T02:29:00.294599Z',
  'home_primary_color': '#1D4ED8',
};

final otherTeamJson = {
  ...teamJson,
  'id': '539e7793-9ddd-42fd-ab83-931dd073d2f5',
  'name': 'Tigres del Norte',
  'tournament_id': 'f0000000-0000-0000-0000-000000000000',
};

final standingJson = {
  'position': 1,
  'team_id': teamId,
  'team_name': 'Águilas FC',
  'matches_played': 3,
  'matches_won': 2,
  'matches_drawn': 0,
  'matches_lost': 1,
  'goals_for': 4,
  'goals_against': 2,
  'goal_difference': 2,
  'points': 6,
  'points_adjustment': 0,
  'recent_form': '',
  'last_match_date': '2026-11-01T00:00:00Z',
};

final publicPlayerJson = {
  'id': playerId,
  'name': 'Luis García',
  'team_id': teamId,
  'position': 'Portero',
  'jersey_number': 1,
  'is_active': true,
};

final verificationJson = {
  'player_id': playerId,
  'name': 'Luis García',
  'jersey_number': 1,
  'position': 'Portero',
  'birth_date': '1995-01-10',
  'team_id': teamId,
  'team_name': 'Águilas FC',
  'status': 'pending',
  'document_key': 'player_document/$playerId/0b6c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d.jpg',
};

void main() {
  late List<http.Request> requests;
  late ApiClient api;
  late Future<http.Response> Function(http.Request) handler;

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

  Map<String, dynamic> bodyOf(http.Request r) => jsonDecode(r.body) as Map<String, dynamic>;

  group('mappers', () {
    test('team', () {
      final team = TeamMapper.fromJson(teamJson);
      expect(team.name, 'Águilas FC');
      expect(team.tournamentId, tournamentId);
      expect(team.isActive, isTrue);
      expect(team.logo, isNull);
      expect(team.groupName, isNull);
      expect(team.homePrimaryColor, '#1D4ED8');
      expect(team.createdAt, isNotNull);
    });

    test('standing uses the team id and keeps the adjustment apart', () {
      final s = TeamStandingMapper.fromJson({...standingJson, 'points_adjustment': -3, 'group_name': 'A'},
          tournamentId: tournamentId);
      expect(s.id, teamId);
      expect(s.teamId, teamId);
      expect(s.tournamentId, tournamentId);
      expect(s.points, 6);
      expect(s.totalPoints, 3);
      expect(s.groupName, 'A');
      expect(s.recentForm, isNull);
    });

    test('public player and league player', () {
      final p = PlayerMapper.fromJson(publicPlayerJson);
      expect(p.jerseyNumber, 1);
      expect(p.position, 'Portero');
      expect(p.idVerified, isFalse);
      expect(p.birthDate, isNull);

      final full = PlayerMapper.fromJson({...publicPlayerJson, 'birth_date': '1995-01-10', 'id_verified': true});
      expect(full.birthDate, DateTime(1995, 1, 10));
      expect(full.idVerified, isTrue);
    });

    test('verification row and summary', () {
      final v = PlayerMapper.verificationFromJson(verificationJson);
      expect(v.status, VerificationStatus.pending);
      expect(v.hasDocument, isTrue);
      expect(v.isPdf, isFalse);
      expect(v.birthDate, DateTime(1995, 1, 10));
      expect(PlayerMapper.verificationFromJson({...verificationJson, 'status': 'no_document'}).status,
          VerificationStatus.noDocument);

      final sum = PlayerMapper.summaryFromJson({'total': 48, 'pending': 1, 'verified': 2, 'no_document': 45});
      expect(sum.noDocument, 45);
    });

    test('coaching staff (public shape)', () {
      final s = CoachingStaffMapper.fromJson({
        'id': 's1',
        'team_id': teamId,
        'name': 'Marta Salas',
        'role': 'Preparador Físico',
        'is_active': true,
      });
      expect(s.role, 'Preparador Físico');
      expect(s.cedula, isNull);
      expect(s.birthDate, isNull);
    });
  });

  group('TeamRepositoryImpl', () {
    test('teams of a tournament: league list filtered by tournament_id', () async {
      handler = (req) async {
        if (req.url.path.endsWith('/tournaments/$tournamentId')) return json({'id': tournamentId, 'league_id': leagueId});
        return json(page([otherTeamJson, teamJson]));
      };
      final result = await TeamRepositoryImpl(api: api).getTeamsByTournamentId(tournamentId);
      final teams = result.getOrElse(() => []);
      expect(teams.map((t) => t.id), [teamId]);
      expect(requests.last.url.path, '/api/v1/teams');
      expect(requests.last.url.queryParameters['league_id'], leagueId);
    });

    test('teams of a tournament with a known league skip the lookup', () async {
      handler = (req) async => json(page([teamJson]));
      await TeamRepositoryImpl(api: api).getTeamsByTournamentId(tournamentId, leagueId: leagueId);
      expect(requests.single.url.path, '/api/v1/teams');
    });

    test('my teams', () async {
      handler = (req) async => json(page([teamJson]));
      final result = await TeamRepositoryImpl(api: api).getMyTeams();
      expect(requests.single.url.path, '/api/v1/my-teams');
      expect(result.getOrElse(() => []).single.id, teamId);
    });

    test('create team sends only CreateTeamRequest fields', () async {
      handler = (req) async => json(teamJson, 201);
      await TeamRepositoryImpl(api: api).createTeam(name: 'Águilas FC', slug: 'equipo-1', leagueId: leagueId);
      expect(requests.single.method, 'POST');
      expect(bodyOf(requests.single), {'name': 'Águilas FC', 'slug': 'equipo-1', 'league_id': leagueId});
    });

    test('team owner: POST /admin/users with team_id and a generated password', () async {
      handler = (req) async => json({'id': 'u1', 'email': 'o@x.mx'}, 201);
      final result = await TeamRepositoryImpl(api: api)
          .createTeamOwner(email: 'o@x.mx', name: 'Owner', leagueId: leagueId, teamId: teamId);
      final body = bodyOf(requests.single);
      expect(requests.single.url.path, '/api/v1/admin/users');
      expect(body['role'], 'team_owner');
      expect(body['team_id'], teamId);
      expect(body['league_id'], leagueId);
      expect((body['password'] as String).length, inInclusiveRange(10, 72));
      final owner = result.getOrElse(() => throw StateError('failed'));
      expect(owner.userId, 'u1');
      expect(owner.password, body['password']);
    });

    test('team owner email taken (409) is a validation failure', () async {
      handler = (req) async => json({
            'error': {'code': 'conflict', 'message': 'ya existe'}
          }, 409);
      final result = await TeamRepositoryImpl(api: api)
          .createTeamOwner(email: 'o@x.mx', name: 'Owner', leagueId: leagueId, teamId: teamId);
      expect(result.fold((f) => f, (_) => null), isA<ValidationFailure>());
    });

    test('update team: PATCH then deactivate only when the state changes', () async {
      handler = (req) async {
        if (req.url.path.endsWith('/deactivate')) return json({...teamJson, 'is_active': false});
        return json(teamJson);
      };
      final result = await TeamRepositoryImpl(api: api).updateTeam(teamId: teamId, name: 'Nuevo', isActive: false);
      expect(requests.map((r) => '${r.method} ${r.url.path}'),
          ['PATCH /api/v1/teams/$teamId', 'POST /api/v1/teams/$teamId/deactivate']);
      expect(bodyOf(requests.first), {'name': 'Nuevo'});
      expect(result.getOrElse(() => throw StateError('failed')).isActive, isFalse);

      requests.clear();
      await TeamRepositoryImpl(api: api).updateTeam(teamId: teamId, name: 'Nuevo', isActive: true);
      expect(requests, hasLength(1));
    });

    test('group assignment and removal', () async {
      handler = (req) async => json(teamJson);
      final repo = TeamRepositoryImpl(api: api);
      await repo.assignToTournament(teamId, tournamentId, groupName: 'B');
      await repo.assignToTournament(teamId, tournamentId);
      expect(bodyOf(requests[0]), {'tournament_id': tournamentId, 'group_name': 'B'});
      expect(bodyOf(requests[1]), {'tournament_id': tournamentId, 'group_name': ''});
    });

    test('delete team is a DELETE', () async {
      handler = (req) async => json(null, 204);
      final result = await TeamRepositoryImpl(api: api).deleteTeam(teamId);
      expect(result.isRight(), isTrue);
      expect(requests.single.method, 'DELETE');
    });

    test('standings are sorted by total points', () async {
      handler = (req) async => json(page([
            {...standingJson, 'team_id': 'b', 'team_name': 'B', 'points': 4},
            {...standingJson, 'team_id': 'a', 'team_name': 'A', 'points': 3, 'points_adjustment': 3},
          ]));
      final result = await TeamRepositoryImpl(api: api).getStandingsByTournament(tournamentId);
      expect(requests.single.url.path, '/api/v1/tournaments/$tournamentId/standings');
      expect(result.getOrElse(() => []).map((s) => s.teamId), ['a', 'b']);
    });

    test('manual standings: PUT totals then the points adjustment', () async {
      handler = (req) async => json(null, 204);
      await TeamRepositoryImpl(api: api).updateStandings(
        teamId: teamId,
        tournamentId: tournamentId,
        matchesPlayed: 3,
        matchesWon: 2,
        matchesDrawn: 0,
        matchesLost: 1,
        goalsFor: 4,
        goalsAgainst: 2,
        pointsAdjustment: -1,
        adjustmentReason: 'Alineación indebida',
      );
      expect(requests[0].method, 'PUT');
      expect(requests[0].url.path, '/api/v1/tournaments/$tournamentId/standings/$teamId');
      expect(bodyOf(requests[0]), {
        'matches_played': 3,
        'matches_won': 2,
        'matches_drawn': 0,
        'matches_lost': 1,
        'goals_for': 4,
        'goals_against': 2,
        'reason': 'Alineación indebida',
      });
      expect(requests[1].url.path, '/api/v1/standings/adjust');
      expect(bodyOf(requests[1]), {
        'team_id': teamId,
        'tournament_id': tournamentId,
        'points_adjustment': -1,
        'adjustment_reason': 'Alineación indebida',
      });
    });

    test('standings use case validates before calling the API', () async {
      handler = (req) async => json(null, 204);
      final useCase = UpdateStandingsUseCase(TeamRepositoryImpl(api: api));
      final bad = await useCase(const UpdateStandingsParams(
        teamId: teamId,
        tournamentId: tournamentId,
        matchesPlayed: 4,
        matchesWon: 2,
        matchesDrawn: 0,
        matchesLost: 1,
        goalsFor: 0,
        goalsAgainst: 0,
      ));
      expect(bad.isLeft(), isTrue);
      final noReason = await useCase(const UpdateStandingsParams(
        teamId: teamId,
        tournamentId: tournamentId,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesDrawn: 0,
        matchesLost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        pointsAdjustment: 2,
      ));
      expect(noReason.isLeft(), isTrue);
      expect(requests, isEmpty);
    });
  });

  group('PlayerRepositoryImpl', () {
    test('create player sends the Go DTO with a YYYY-MM-DD birth date', () async {
      handler = (req) async => json({...publicPlayerJson, 'birth_date': '1995-01-10', 'id_verified': false}, 201);
      final result = await PlayerRepositoryImpl(api: api).createPlayer(
        name: 'Luis García',
        teamId: teamId,
        position: 'Portero',
        jerseyNumber: 1,
        birthDate: DateTime(1995, 1, 10),
      );
      expect(requests.single.url.path, '/api/v1/teams/$teamId/players');
      expect(bodyOf(requests.single),
          {'name': 'Luis García', 'position': 'Portero', 'jersey_number': 1, 'birth_date': '1995-01-10'});
      expect(result.isRight(), isTrue);
    });

    test('a taken jersey number (409) is a validation failure', () async {
      handler = (req) async => json({
            'error': {'code': 'conflict', 'message': 'conflicto'}
          }, 409);
      final result = await PlayerRepositoryImpl(api: api)
          .createPlayer(name: 'X', teamId: teamId, position: 'Portero', jerseyNumber: 1);
      expect(result.fold((f) => f.message, (_) => ''), contains('número 1'));
    });

    test('registration rule errors keep the field messages', () async {
      handler = (req) async => json({
            'error': {
              'code': 'validation',
              'message': 'Datos inválidos',
              'fields': {'birth_date': 'la fecha de nacimiento es obligatoria en este torneo'}
            }
          }, 400);
      final result = await PlayerRepositoryImpl(api: api)
          .createPlayer(name: 'X', teamId: teamId, position: 'Portero', jerseyNumber: 7);
      final failure = result.fold((f) => f, (_) => null);
      expect(failure, isA<ValidationFailure>());
      expect(failure!.message, contains('obligatoria'));
    });

    test('update sends only the given fields; delete deactivates', () async {
      handler = (req) async => json(publicPlayerJson);
      final repo = PlayerRepositoryImpl(api: api);
      await repo.updatePlayer(playerId: playerId, jerseyNumber: 9, photo: '');
      await repo.deletePlayer(playerId);
      expect(requests[0].method, 'PATCH');
      expect(bodyOf(requests[0]), {'jersey_number': 9, 'photo': ''});
      expect('${requests[1].method} ${requests[1].url.path}', 'POST /api/v1/players/$playerId/deactivate');
    });

    test('player by id adds the private verification when allowed', () async {
      handler = (req) async {
        if (req.url.path.endsWith('/verification')) {
          return json({'player_id': playerId, 'id_verified': true, 'document_key': verificationJson['document_key']});
        }
        return json(publicPlayerJson);
      };
      final player = (await PlayerRepositoryImpl(api: api).getPlayerById(playerId)).getOrElse(() => throw StateError(''));
      expect(player.idVerified, isTrue);
      expect(player.documentKey, isNotNull);
    });

    test('player by id ignores a forbidden verification', () async {
      handler = (req) async {
        if (req.url.path.endsWith('/verification')) {
          return json({
            'error': {'code': 'forbidden', 'message': 'no'}
          }, 403);
        }
        return json(publicPlayerJson);
      };
      final result = await PlayerRepositoryImpl(api: api).getPlayerById(playerId);
      expect(result.isRight(), isTrue);
    });

    test('photo upload uses scope player and returns the public url', () async {
      handler = (req) async => json({'key': 'player/$playerId/x.jpg', 'url': 'http://cdn/x.jpg', 'is_public': true}, 201);
      final result = await PlayerRepositoryImpl(api: api)
          .uploadPlayerPhoto(playerId: playerId, bytes: [1, 2, 3], filename: 'photo.jpg');
      expect(result.getOrElse(() => ''), 'http://cdn/x.jpg');
      expect(requests.single.url.path, '/api/v1/storage/objects');
    });

    test('league players filtered by id_verified', () async {
      handler = (req) async => json(page([
            {...publicPlayerJson, 'team_name': 'Águilas FC', 'id_verified': false},
            {...publicPlayerJson, 'id': 'p2', 'name': 'Ana', 'id_verified': true},
          ]));
      final result = await PlayerRepositoryImpl(api: api).getPlayersByLeagueId(leagueId, idVerified: true);
      expect(requests.single.url.path, '/api/v1/leagues/$leagueId/players');
      expect(result.getOrElse(() => []).map((p) => p.id), ['p2']);
    });

    test('verification queue reads the list and the summary', () async {
      handler = (req) async {
        if (req.url.path.endsWith('/summary')) return json({'total': 1, 'pending': 1, 'verified': 0, 'no_document': 0});
        return json(page([verificationJson]));
      };
      final queue = (await PlayerRepositoryImpl(api: api).getVerificationQueue(leagueId)).getOrElse(() => throw StateError(''));
      expect(queue.players.single.status, VerificationStatus.pending);
      expect(queue.summary.pending, 1);
      expect(requests.map((r) => r.url.path).toSet(), {
        '/api/v1/leagues/$leagueId/players/verification',
        '/api/v1/leagues/$leagueId/players/verification/summary',
      });
    });

    test('verify sends the document key; document url asks the server', () async {
      handler = (req) async {
        if (req.url.path == '/api/v1/storage/url') return json({'url': 'http://signed'});
        return json({'player_id': playerId, 'id_verified': true});
      };
      final repo = PlayerRepositoryImpl(api: api);
      await repo.setPlayerVerification(playerId: playerId, verified: true, documentKey: 'k');
      final url = await repo.getDocumentUrl('k');
      expect(requests[0].method, 'PATCH');
      expect(requests[0].url.path, '/api/v1/players/$playerId/verification');
      expect(bodyOf(requests[0]), {'verified': true, 'document_key': 'k'});
      expect(requests[1].url.queryParameters['key'], 'k');
      expect(url.getOrElse(() => ''), 'http://signed');
    });
  });

  group('CoachingStaffRepositoryImpl', () {
    test('list, create, update and deactivate', () async {
      handler = (req) async {
        if (req.method == 'GET') {
          return json(page([
            {'id': 's1', 'team_id': teamId, 'name': 'Marta', 'role': 'Preparador Físico', 'is_active': true}
          ]));
        }
        return json({'id': 's1', 'team_id': teamId, 'name': 'Marta', 'role': 'Médico', 'is_active': true, 'cedula': '123'});
      };
      final repo = CoachingStaffRepositoryImpl(api: api);
      final list = await repo.getStaffByTeamId(teamId);
      expect(list.getOrElse(() => []).single.name, 'Marta');

      await repo.createStaff(name: 'Marta', teamId: teamId, role: 'medico', birthDate: DateTime(1985, 3, 2), cedula: '');
      expect(requests[1].url.path, '/api/v1/teams/$teamId/coaching-staff');
      expect(bodyOf(requests[1]), {'name': 'Marta', 'role': 'medico', 'birth_date': '1985-03-02'});

      await repo.updateStaff(staffId: 's1', isActive: true);
      expect(requests[2].method, 'PATCH');
      expect(bodyOf(requests[2]), {'is_active': true});

      await repo.deleteStaff('s1');
      expect('${requests[3].method} ${requests[3].url.path}', 'POST /api/v1/coaching-staff/s1/deactivate');
    });
  });
}
