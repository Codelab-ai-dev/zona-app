import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zona_gol_mobile/core/network/api_client.dart';
import 'package:zona_gol_mobile/core/network/api_exception.dart';
import 'package:zona_gol_mobile/core/network/token_store.dart';

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
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

String future() => DateTime.now().add(const Duration(minutes: 15)).toUtc().toIso8601String();

void main() {
  late MemoryStore store;
  late TokenStore tokens;
  late List<http.Request> requests;

  ApiClient client(Future<http.Response> Function(http.Request) handler) {
    return ApiClient(
      baseUrl: 'http://api.test/',
      tokens: tokens,
      httpClient: MockClient((req) {
        requests.add(req);
        return handler(req);
      }),
    );
  }

  setUp(() {
    store = MemoryStore();
    tokens = TokenStore(store);
    requests = [];
  });

  test('login stores the tokens and sends X-Client: mobile', () async {
    final api = client((req) async => json({'access_token': 'a1', 'refresh_token': 'r1', 'expires_at': future()}));
    await api.login('liga@zonagol.local', 'secreto-123');

    expect(requests.single.url.toString(), 'http://api.test/api/v1/auth/login');
    expect(requests.single.headers['X-Client'], 'mobile');
    expect(await tokens.accessToken, 'a1');
    expect(await tokens.refreshToken, 'r1');
    expect(await api.hasSession, isTrue);
  });

  test('a 401 refreshes once (single flight) and retries the requests', () async {
    await tokens.save(access: 'old', refresh: 'r1', expiresAt: DateTime.now().add(const Duration(minutes: 5)));
    var refreshes = 0;
    final api = client((req) async {
      if (req.url.path.endsWith('/auth/refresh')) {
        refreshes++;
        expect(jsonDecode(req.body), {'refresh_token': 'r1'});
        await Future<void>.delayed(const Duration(milliseconds: 10));
        return json({'access_token': 'new', 'refresh_token': 'r2', 'expires_at': future()});
      }
      if (req.headers['Authorization'] == 'Bearer old') return json({'error': {'code': 'unauthorized', 'message': 'x'}}, 401);
      return json({'ok': req.url.path});
    });

    final results = await Future.wait([api.get('/me'), api.get('/leagues/mine')]);
    expect(results, [
      {'ok': '/api/v1/me'},
      {'ok': '/api/v1/leagues/mine'},
    ]);
    expect(refreshes, 1);
    expect(await tokens.refreshToken, 'r2');
  });

  test('an expiring access token is refreshed before the request', () async {
    await tokens.save(access: 'old', refresh: 'r1', expiresAt: DateTime.now().add(const Duration(seconds: 5)));
    final api = client((req) async {
      if (req.url.path.endsWith('/auth/refresh')) {
        return json({'access_token': 'new', 'refresh_token': 'r2', 'expires_at': future()});
      }
      return json({'auth': req.headers['Authorization']});
    });
    expect(await api.get('/me'), {'auth': 'Bearer new'});
  });

  test('a rejected refresh token ends the session and notifies', () async {
    await tokens.save(access: 'old', refresh: 'r1', expiresAt: DateTime.now().add(const Duration(minutes: 5)));
    final api = client((req) async => json({'error': {'code': 'unauthorized', 'message': 'Sesión inválida'}}, 401));
    final expired = expectLater(api.sessionExpired, emits(null));

    await expectLater(api.get('/me'), throwsA(isA<ApiException>().having((e) => e.status, 'status', 401)));
    await expired;
    expect(await api.hasSession, isFalse);
  });

  test('a network failure during refresh keeps the session', () async {
    await tokens.save(access: 'old', refresh: 'r1', expiresAt: DateTime.now().subtract(const Duration(minutes: 1)));
    final api = client((req) async => throw http.ClientException('offline'));

    await expectLater(api.get('/me'), throwsA(isA<ApiException>().having((e) => e.isNetwork, 'isNetwork', true)));
    expect(await tokens.refreshToken, 'r1');
  });

  test('errors carry the API code, message and fields', () async {
    final api = client((req) async => json({
          'error': {'code': 'validation_failed', 'message': 'Datos inválidos', 'fields': {'name': 'requerido'}}
        }, 422));
    await expectLater(
      api.post('/teams', {'name': ''}),
      throwsA(isA<ApiException>()
          .having((e) => e.isValidation, 'isValidation', true)
          .having((e) => e.fields, 'fields', {'name': 'requerido'})
          .having((e) => e.fullMessage, 'fullMessage', 'Datos inválidos: name: requerido')),
    );
  });

  test('getAll pages until a short page and skips empty query values', () async {
    final api = client((req) async {
      final offset = int.parse(req.url.queryParameters['offset']!);
      final count = offset == 0 ? 2 : 1;
      return json({
        'data': List.generate(count, (i) => {'n': offset + i}),
        'page': {'limit': 2, 'offset': offset}
      });
    });
    final all = await api.getAll('/teams', query: {'league_id': 'l1', 'q': ''}, pageSize: 2);
    expect(all.map((e) => e['n']), [0, 1, 2]);
    expect(requests.first.url.queryParameters, {'league_id': 'l1', 'limit': '2', 'offset': '0'});
  });

  test('logout revokes the refresh token and clears even when offline', () async {
    await tokens.save(access: 'a', refresh: 'r1', expiresAt: DateTime.now().add(const Duration(minutes: 5)));
    final api = client((req) async => throw http.ClientException('offline'));
    await api.logout();
    expect(requests.single.url.path, '/api/v1/auth/logout');
    expect(await api.hasSession, isFalse);
    expect(store.values, isEmpty);
  });
}
