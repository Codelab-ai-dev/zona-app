import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zona_gol_mobile/core/errors/failures.dart';
import 'package:zona_gol_mobile/core/network/api_client.dart';
import 'package:zona_gol_mobile/core/network/token_store.dart';
import 'package:zona_gol_mobile/data/mappers/suspension_mapper.dart';
import 'package:zona_gol_mobile/data/repositories/suspension_repository_impl.dart';
import 'package:zona_gol_mobile/domain/entities/suspension_entity.dart';

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
    : http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

const leagueId = '62749413-4725-4100-a14f-9dc5fd47cb2e';

Map<String, dynamic> suspensionRow({Map<String, dynamic> extra = const {}}) => {
      'id': 's1',
      'player_id': 'p1',
      'team_id': 't1',
      'league_id': leagueId,
      'suspension_type': 'yellow_accumulation',
      'reason': '5 amarillas',
      'matches_to_serve': 2,
      'matches_served': 1,
      'status': 'active',
      'notes': 'revisar',
      'start_date': '2026-11-01T00:00:00Z',
      'created_at': '2026-11-01T10:00:00Z',
      'updated_at': '2026-11-02T10:00:00Z',
      'player_name': 'Luis García',
      'player_jersey': 10,
      'team_name': 'Águilas FC',
      ...extra,
    };

void main() {
  late List<http.Request> requests;
  late Future<http.Response> Function(http.Request) handler;
  late SuspensionRepositoryImpl repo;

  setUp(() async {
    requests = [];
    final tokens = TokenStore(MemoryStore());
    await tokens.save(access: 'tok', refresh: 'r', expiresAt: DateTime.now().add(const Duration(hours: 1)));
    repo = SuspensionRepositoryImpl(
      api: ApiClient(
        baseUrl: 'http://api.test',
        tokens: tokens,
        httpClient: MockClient((req) {
          requests.add(req);
          return handler(req);
        }),
      ),
    );
  });

  group('SuspensionMapper', () {
    test('reads the Go Suspension with display fields', () {
      final s = SuspensionMapper.fromJson(suspensionRow());
      expect(s.id, 's1');
      expect(s.suspensionType, SuspensionType.yellowAccumulation);
      expect(s.status, SuspensionStatus.active);
      expect(s.matchesRemaining, 1);
      expect(s.reason, '5 amarillas');
      expect(s.notes, 'revisar');
      expect(s.playerName, 'Luis García');
      expect(s.jerseyNumber, 10);
      expect(s.teamName, 'Águilas FC');
      expect(s.displayName, '#10 Luis García');
      expect(s.createdAt, DateTime.utc(2026, 11, 1, 10).toLocal());
    });

    test('omitted optional fields', () {
      final row = suspensionRow()
        ..remove('notes')
        ..remove('player_jersey')
        ..['reason'] = ''
        ..['status'] = 'cancelled';
      final s = SuspensionMapper.fromJson(row);
      expect(s.notes, isNull);
      expect(s.jerseyNumber, isNull);
      expect(s.reason, isNull);
      expect(s.status, SuspensionStatus.cancelled);
      expect(s.tournamentId, isNull);
    });
  });

  group('SuspensionRepositoryImpl', () {
    test('getSuspensionsByLeague', () async {
      handler = (_) async => json({'data': [suspensionRow()], 'page': {'limit': 20, 'offset': 0}});
      final result = await repo.getSuspensionsByLeague(leagueId);
      expect(requests.single.url.path, '/api/v1/leagues/$leagueId/suspensions');
      expect(result.getOrElse(() => []).single.playerName, 'Luis García');
    });

    test('createSuspension sends only CreateSuspensionRequest fields', () async {
      handler = (_) async => json(suspensionRow(), 201);
      final result = await repo.createSuspension(
        playerId: 'p1',
        teamId: 't1',
        suspensionType: 'red_card',
        reason: 'Agresión',
        matchesToServe: 3,
      );
      expect(result.isRight(), isTrue);
      expect(requests.single.method, 'POST');
      expect(requests.single.url.path, '/api/v1/suspensions');
      expect(requests.single.url.query, isEmpty);
      expect(jsonDecode(requests.single.body), {
        'player_id': 'p1',
        'team_id': 't1',
        'suspension_type': 'red_card',
        'reason': 'Agresión',
        'matches_to_serve': 3,
      });
    });

    test('update, cancel, complete and clear', () async {
      handler = (req) async => req.method == 'DELETE' ? json({'deleted': 4}) : json(suspensionRow());
      expect((await repo.updateSuspension('s1', matchesToServe: 4)).isRight(), isTrue);
      expect((await repo.cancelSuspension('s1')).isRight(), isTrue);
      expect((await repo.completeSuspension('s1')).isRight(), isTrue);
      expect((await repo.clearAllSuspensions(leagueId)).isRight(), isTrue);

      expect(requests.map((r) => '${r.method} ${r.url.path}').toList(), [
        'PUT /api/v1/suspensions/s1',
        'POST /api/v1/suspensions/s1/cancel',
        'POST /api/v1/suspensions/s1/complete',
        'DELETE /api/v1/leagues/$leagueId/suspensions',
      ]);
      expect(jsonDecode(requests.first.body), {'matches_to_serve': 4});
    });

    test('getLeaguePlayers pages through /leagues/{id}/players', () async {
      handler = (req) async {
        final offset = int.parse(req.url.queryParameters['offset'] ?? '0');
        final rows = List.generate(
          offset == 0 ? 100 : 3,
          (i) => {
            'id': 'p${offset + i}',
            'name': 'Jugador ${(offset + i).toString().padLeft(3, '0')}',
            'jersey_number': i,
            'position': 'Defensa',
            'team_id': 't1',
            'team_name': 'Águilas FC',
            'is_active': true,
            'id_verified': false,
          },
        );
        return json({'data': rows, 'page': {'limit': 100, 'offset': offset, 'total': 103}});
      };
      final result = await repo.getLeaguePlayers(leagueId);
      final players = result.getOrElse(() => []);
      expect(players, hasLength(103));
      expect(requests.first.url.path, '/api/v1/leagues/$leagueId/players');
      expect(players.first, {
        'id': 'p0',
        'name': 'Jugador 000',
        'jersey_number': 0,
        'team_id': 't1',
        'team_name': 'Águilas FC',
      });
    });

    test('validation errors become ValidationFailure', () async {
      handler = (_) async => json({
            'error': {
              'code': 'validation_failed',
              'message': 'Los datos enviados no son válidos',
              'fields': {'reason': 'requerido'},
            }
          }, 400);
      final result = await repo.createSuspension(
          playerId: 'p1', teamId: 't1', suspensionType: 'other', reason: '', matchesToServe: 1);
      expect(result.fold((f) => f, (_) => null), isA<ValidationFailure>());
    });
  });
}
