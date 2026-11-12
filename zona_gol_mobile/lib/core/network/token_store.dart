/// Key-value persistence for the tokens (secure storage in the app, a map in
/// tests).
abstract class KeyValueStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

/// Session tokens, persisted in a [KeyValueStore] and cached in memory.
class TokenStore {
  TokenStore(this._store);

  static const _accessKey = 'zg_access_token';
  static const _refreshKey = 'zg_refresh_token';
  static const _expiresKey = 'zg_access_expires_at';

  final KeyValueStore _store;
  bool _loaded = false;
  String? _access;
  String? _refresh;
  DateTime? _expiresAt;

  Future<void> _load() async {
    if (_loaded) return;
    _access = await _store.read(_accessKey);
    _refresh = await _store.read(_refreshKey);
    _expiresAt = DateTime.tryParse(await _store.read(_expiresKey) ?? '');
    _loaded = true;
  }

  Future<String?> get accessToken async {
    await _load();
    return _access;
  }

  Future<String?> get refreshToken async {
    await _load();
    return _refresh;
  }

  /// True when the access token is missing or expires within [margin].
  Future<bool> accessExpiresWithin(Duration margin) async {
    await _load();
    final exp = _expiresAt;
    return _access == null || exp == null || DateTime.now().add(margin).isAfter(exp);
  }

  Future<bool> get hasSession async => (await refreshToken)?.isNotEmpty ?? false;

  Future<void> save({required String access, required String refresh, required DateTime expiresAt}) async {
    _access = access;
    _refresh = refresh;
    _expiresAt = expiresAt;
    _loaded = true;
    await _store.write(_accessKey, access);
    await _store.write(_refreshKey, refresh);
    await _store.write(_expiresKey, expiresAt.toUtc().toIso8601String());
  }

  Future<void> clear() async {
    _access = null;
    _refresh = null;
    _expiresAt = null;
    _loaded = true;
    await _store.delete(_accessKey);
    await _store.delete(_refreshKey);
    await _store.delete(_expiresKey);
  }
}
