import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_exception.dart';
import 'token_store.dart';

/// HTTP client for the Zona Gol API (`/api/v1`).
///
/// - Sends the access token as `Authorization: Bearer`.
/// - Refreshes it once (single flight) when it is about to expire or a
///   request returns 401, then retries the request once.
/// - When the refresh token is rejected the session is cleared and
///   [sessionExpired] fires; a network failure never ends the session.
/// - Errors come back as [ApiException].
class ApiClient {
  ApiClient({
    required String baseUrl,
    required TokenStore tokens,
    http.Client? httpClient,
    this.timeout = const Duration(seconds: 30),
  })  : _base = Uri.parse(baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl),
        _tokens = tokens,
        _http = httpClient ?? http.Client();

  static const _prefix = '/api/v1';
  static const _mobileHeader = {'X-Client': 'mobile'};

  final Uri _base;
  final TokenStore _tokens;
  final http.Client _http;
  final Duration timeout;
  final _expired = StreamController<void>.broadcast();
  Future<bool>? _refreshing;

  /// Fires when the session can no longer be renewed (sign in again).
  Stream<void> get sessionExpired => _expired.stream;

  Future<bool> get hasSession => _tokens.hasSession;

  Uri uri(String path, [Map<String, Object?>? query]) {
    final q = <String, String>{};
    query?.forEach((k, v) {
      if (v != null && v.toString().isNotEmpty) q[k] = v.toString();
    });
    return _base.replace(path: '${_base.path}$_prefix$path', queryParameters: q.isEmpty ? null : q);
  }

  // ---------------------------------------------------------------- session

  /// Signs in and stores the tokens.
  Future<void> login(String email, String password) async {
    final res = await _raw('POST', '/auth/login', body: {'email': email, 'password': password}, headers: _mobileHeader);
    await _storeTokens(_decode(res) as Map<String, dynamic>);
  }

  /// Revokes the refresh token (best effort) and clears the session.
  Future<void> logout() async {
    final refresh = await _tokens.refreshToken;
    try {
      if (refresh != null && refresh.isNotEmpty) {
        await _raw('POST', '/auth/logout', body: {'refresh_token': refresh}, headers: _mobileHeader);
      }
    } catch (_) {
      // Offline or already revoked: the local session is cleared anyway.
    } finally {
      await _tokens.clear();
    }
  }

  /// Clears the local session without calling the server.
  Future<void> clearSession() => _tokens.clear();

  Future<void> _storeTokens(Map<String, dynamic> body) async {
    final access = body['access_token'] as String?;
    final refresh = body['refresh_token'] as String?;
    final expires = DateTime.tryParse(body['expires_at'] as String? ?? '');
    if (access == null || refresh == null || expires == null) {
      throw const ApiException(500, 'bad_session', 'Respuesta de sesión inválida');
    }
    await _tokens.save(access: access, refresh: refresh, expiresAt: expires);
  }

  /// Renews the access token. Returns false when the session is over.
  Future<bool> _refresh() {
    return _refreshing ??= () async {
      try {
        final refresh = await _tokens.refreshToken;
        if (refresh == null || refresh.isEmpty) return false;
        final res = await _raw('POST', '/auth/refresh', body: {'refresh_token': refresh}, headers: _mobileHeader);
        if (res.statusCode == 200) {
          await _storeTokens(_decode(res) as Map<String, dynamic>);
          return true;
        }
        if (res.statusCode == 400 || res.statusCode == 401) {
          await _tokens.clear();
          _expired.add(null);
          return false;
        }
        throw _error(res);
      } finally {
        _refreshing = null;
      }
    }();
  }

  // --------------------------------------------------------------- requests

  Future<dynamic> get(String path, {Map<String, Object?>? query}) => _send('GET', path, query: query);
  Future<dynamic> post(String path, [Object? body]) => _send('POST', path, body: body ?? const {});
  Future<dynamic> patch(String path, Object body) => _send('PATCH', path, body: body);
  Future<dynamic> put(String path, Object body) => _send('PUT', path, body: body);
  Future<dynamic> delete(String path, {Map<String, Object?>? query}) => _send('DELETE', path, query: query);

  /// GET of an object.
  Future<Map<String, dynamic>> getObject(String path, {Map<String, Object?>? query}) async =>
      (await get(path, query: query) as Map).cast<String, dynamic>();

  /// One page of a list endpoint (`{"data": [...], "page": {...}}`).
  Future<List<Map<String, dynamic>>> getList(String path, {Map<String, Object?>? query, int? limit, int? offset}) async {
    final body = await get(path, query: {...?query, 'limit': limit, 'offset': offset});
    return _items(body);
  }

  /// Every page of a list endpoint (pages of [pageSize], at most [maxItems]).
  Future<List<Map<String, dynamic>>> getAll(String path,
      {Map<String, Object?>? query, int pageSize = 100, int maxItems = 5000}) async {
    final all = <Map<String, dynamic>>[];
    while (all.length < maxItems) {
      final page = await getList(path, query: query, limit: pageSize, offset: all.length);
      all.addAll(page);
      if (page.length < pageSize) break;
    }
    return all;
  }

  static List<Map<String, dynamic>> _items(dynamic body) {
    final data = body is Map ? body['data'] : body;
    if (data is! List) return const [];
    return data.map((e) => (e as Map).cast<String, dynamic>()).toList();
  }

  /// Multipart upload (e.g. `POST /storage/objects` with file, scope, scope_id).
  Future<Map<String, dynamic>> upload(
    String path, {
    required List<int> bytes,
    required String filename,
    String fileField = 'file',
    Map<String, String> fields = const {},
  }) async {
    Future<http.Response> send() async {
      final req = http.MultipartRequest('POST', uri(path))
        ..fields.addAll(fields)
        ..files.add(http.MultipartFile.fromBytes(fileField, bytes, filename: filename));
      final token = await _validToken();
      if (token != null) req.headers['Authorization'] = 'Bearer $token';
      return _guard(() async => http.Response.fromStream(await _http.send(req).timeout(timeout)));
    }

    var res = await send();
    if (res.statusCode == 401 && await _refresh()) res = await send();
    if (res.statusCode >= 400) throw _error(res);
    return (_decode(res) as Map).cast<String, dynamic>();
  }

  Future<String?> _validToken() async {
    if (await _tokens.hasSession && await _tokens.accessExpiresWithin(const Duration(seconds: 30))) {
      await _refresh();
    }
    return _tokens.accessToken;
  }

  Future<dynamic> _send(String method, String path, {Map<String, Object?>? query, Object? body}) async {
    var token = await _validToken();
    var res = await _raw(method, path, query: query, body: body, token: token);
    if (res.statusCode == 401 && token != null && await _refresh()) {
      token = await _tokens.accessToken;
      res = await _raw(method, path, query: query, body: body, token: token);
    }
    if (res.statusCode >= 400) throw _error(res);
    return _decode(res);
  }

  Future<http.Response> _raw(String method, String path,
      {Map<String, Object?>? query, Object? body, String? token, Map<String, String>? headers}) {
    final req = http.Request(method, uri(path, query))
      ..headers['Accept'] = 'application/json'
      ..headers.addAll(headers ?? const {});
    if (token != null) req.headers['Authorization'] = 'Bearer $token';
    if (body != null) {
      req.headers['Content-Type'] = 'application/json';
      req.body = jsonEncode(body);
    }
    return _guard(() async => http.Response.fromStream(await _http.send(req).timeout(timeout)));
  }

  Future<http.Response> _guard(Future<http.Response> Function() run) async {
    try {
      return await run();
    } on TimeoutException {
      throw const ApiException.network('El servidor tardó demasiado en responder');
    } on http.ClientException {
      throw const ApiException.network();
    } on Exception catch (e) {
      // SocketException / HandshakeException (dart:io) without importing it.
      if (e.runtimeType.toString().contains('Socket') || e.runtimeType.toString().contains('Handshake')) {
        throw const ApiException.network();
      }
      rethrow;
    }
  }

  static dynamic _decode(http.Response res) {
    if (res.statusCode == 204 || res.bodyBytes.isEmpty) return null;
    return jsonDecode(utf8.decode(res.bodyBytes));
  }

  static ApiException _error(http.Response res) {
    try {
      final err = (_decode(res) as Map)['error'] as Map;
      final fields = (err['fields'] as Map?)?.map((k, v) => MapEntry('$k', '$v')) ?? const <String, String>{};
      return ApiException(res.statusCode, '${err['code'] ?? 'error'}', '${err['message'] ?? 'Error del servidor'}', fields);
    } catch (_) {
      return ApiException(res.statusCode, 'error', 'Error del servidor (${res.statusCode})');
    }
  }
}
