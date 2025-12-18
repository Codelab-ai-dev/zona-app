import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Service for managing offline data caching
/// Uses flutter_secure_storage for sensitive data (tokens)
/// Uses shared_preferences for non-sensitive data (tournaments, matches, players)
class CacheService {
  static final CacheService _instance = CacheService._internal();
  factory CacheService() => _instance;
  CacheService._internal();

  // Secure storage for tokens and sensitive data
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
  );

  // Shared preferences for non-sensitive data
  SharedPreferences? _prefs;

  // Cache keys
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _sessionCachedAtKey = 'session_cached_at';
  static const String _sessionExpiresAtKey = 'session_expires_at';
  static const String _userProfileKey = 'user_profile';
  static const String _tournamentsKey = 'tournaments';
  static const String _matchesKey = 'matches';
  static const String _playersKey = 'players';
  static const String _cacheVersionKey = 'cache_version';

  // Cache TTL configuration (48 hours recommended)
  static const Duration sessionTTL = Duration(hours: 48);
  static const Duration dataTTL = Duration(hours: 24);

  // Current cache version - increment this when schema changes
  static const int currentCacheVersion = 1;

  /// Initialize the cache service
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    await _checkCacheVersion();
  }

  /// Check if cache version matches current app version
  /// Clear cache if version mismatch (handles schema changes)
  Future<void> _checkCacheVersion() async {
    final storedVersion = _prefs?.getInt(_cacheVersionKey) ?? 0;
    if (storedVersion != currentCacheVersion) {
      print('🔄 Cache version mismatch. Clearing old cache...');
      await clearAllCache();
      await _prefs?.setInt(_cacheVersionKey, currentCacheVersion);
    }
  }

  // ============================================================================
  // SESSION & TOKENS (Secure Storage)
  // ============================================================================

  /// Cache session tokens securely
  Future<void> cacheSession({
    required String accessToken,
    required String refreshToken,
    DateTime? expiresAt,
  }) async {
    final now = DateTime.now();
    final expiration = expiresAt ?? now.add(sessionTTL);

    await _secureStorage.write(key: _accessTokenKey, value: accessToken);
    await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
    await _secureStorage.write(
        key: _sessionCachedAtKey, value: now.toIso8601String());
    await _secureStorage.write(
        key: _sessionExpiresAtKey, value: expiration.toIso8601String());

    print('✅ Session cached until: $expiration');
  }

  /// Get cached access token
  Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: _accessTokenKey);
  }

  /// Get cached refresh token
  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  /// Check if cached session is still valid based on TTL
  Future<bool> isSessionValid() async {
    try {
      final expiresAtStr =
          await _secureStorage.read(key: _sessionExpiresAtKey);
      if (expiresAtStr == null) return false;

      final expiresAt = DateTime.parse(expiresAtStr);
      final isValid = DateTime.now().isBefore(expiresAt);

      print(isValid
          ? '✅ Cached session valid until: $expiresAt'
          : '⚠️ Cached session expired at: $expiresAt');

      return isValid;
    } catch (e) {
      print('❌ Error checking session validity: $e');
      return false;
    }
  }

  /// Get session cache timestamp
  Future<DateTime?> getSessionCachedAt() async {
    final cachedAtStr = await _secureStorage.read(key: _sessionCachedAtKey);
    if (cachedAtStr == null) return null;
    return DateTime.parse(cachedAtStr);
  }

  /// Clear session tokens
  Future<void> clearSession() async {
    await _secureStorage.delete(key: _accessTokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
    await _secureStorage.delete(key: _sessionCachedAtKey);
    await _secureStorage.delete(key: _sessionExpiresAtKey);
    print('🗑️ Session cache cleared');
  }

  // ============================================================================
  // USER PROFILE (Shared Preferences)
  // ============================================================================

  /// Cache user profile data
  Future<void> cacheUserProfile(Map<String, dynamic> profile) async {
    final profileJson = jsonEncode(profile);
    await _prefs?.setString(_userProfileKey, profileJson);
    print('✅ User profile cached');
  }

  /// Get cached user profile
  Future<Map<String, dynamic>?> getUserProfile() async {
    final profileJson = _prefs?.getString(_userProfileKey);
    if (profileJson == null) return null;

    try {
      return jsonDecode(profileJson) as Map<String, dynamic>;
    } catch (e) {
      print('❌ Error decoding user profile: $e');
      return null;
    }
  }

  /// Clear user profile cache
  Future<void> clearUserProfile() async {
    await _prefs?.remove(_userProfileKey);
    print('🗑️ User profile cache cleared');
  }

  // ============================================================================
  // TOURNAMENTS (Shared Preferences)
  // ============================================================================

  /// Cache tournaments list with timestamp
  Future<void> cacheTournaments(List<Map<String, dynamic>> tournaments) async {
    final data = {
      'cached_at': DateTime.now().toIso8601String(),
      'tournaments': tournaments,
    };
    final json = jsonEncode(data);
    await _prefs?.setString(_tournamentsKey, json);
    print('✅ ${tournaments.length} tournaments cached');
  }

  /// Get cached tournaments
  Future<List<Map<String, dynamic>>?> getTournaments() async {
    final json = _prefs?.getString(_tournamentsKey);
    if (json == null) return null;

    try {
      final data = jsonDecode(json) as Map<String, dynamic>;
      final cachedAt = DateTime.parse(data['cached_at'] as String);

      // Check if cache is stale
      if (DateTime.now().difference(cachedAt) > dataTTL) {
        print('⚠️ Tournaments cache is stale');
        return null;
      }

      final tournaments = (data['tournaments'] as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();

      print('✅ Loaded ${tournaments.length} tournaments from cache');
      return tournaments;
    } catch (e) {
      print('❌ Error decoding tournaments: $e');
      return null;
    }
  }

  /// Clear tournaments cache
  Future<void> clearTournaments() async {
    await _prefs?.remove(_tournamentsKey);
    print('🗑️ Tournaments cache cleared');
  }

  // ============================================================================
  // MATCHES (Shared Preferences)
  // ============================================================================

  /// Cache matches list with timestamp
  Future<void> cacheMatches(List<Map<String, dynamic>> matches) async {
    final data = {
      'cached_at': DateTime.now().toIso8601String(),
      'matches': matches,
    };
    final json = jsonEncode(data);
    await _prefs?.setString(_matchesKey, json);
    print('✅ ${matches.length} matches cached');
  }

  /// Get cached matches
  Future<List<Map<String, dynamic>>?> getMatches() async {
    final json = _prefs?.getString(_matchesKey);
    if (json == null) return null;

    try {
      final data = jsonDecode(json) as Map<String, dynamic>;
      final cachedAt = DateTime.parse(data['cached_at'] as String);

      // Check if cache is stale
      if (DateTime.now().difference(cachedAt) > dataTTL) {
        print('⚠️ Matches cache is stale');
        return null;
      }

      final matches =
          (data['matches'] as List).map((e) => e as Map<String, dynamic>).toList();

      print('✅ Loaded ${matches.length} matches from cache');
      return matches;
    } catch (e) {
      print('❌ Error decoding matches: $e');
      return null;
    }
  }

  /// Clear matches cache
  Future<void> clearMatches() async {
    await _prefs?.remove(_matchesKey);
    print('🗑️ Matches cache cleared');
  }

  // ============================================================================
  // PLAYERS (Shared Preferences)
  // ============================================================================

  /// Cache players list with timestamp
  Future<void> cachePlayers(List<Map<String, dynamic>> players) async {
    final data = {
      'cached_at': DateTime.now().toIso8601String(),
      'players': players,
    };
    final json = jsonEncode(data);
    await _prefs?.setString(_playersKey, json);
    print('✅ ${players.length} players cached');
  }

  /// Get cached players
  Future<List<Map<String, dynamic>>?> getPlayers() async {
    final json = _prefs?.getString(_playersKey);
    if (json == null) return null;

    try {
      final data = jsonDecode(json) as Map<String, dynamic>;
      final cachedAt = DateTime.parse(data['cached_at'] as String);

      // Check if cache is stale
      if (DateTime.now().difference(cachedAt) > dataTTL) {
        print('⚠️ Players cache is stale');
        return null;
      }

      final players =
          (data['players'] as List).map((e) => e as Map<String, dynamic>).toList();

      print('✅ Loaded ${players.length} players from cache');
      return players;
    } catch (e) {
      print('❌ Error decoding players: $e');
      return null;
    }
  }

  /// Clear players cache
  Future<void> clearPlayers() async {
    await _prefs?.remove(_playersKey);
    print('🗑️ Players cache cleared');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /// Clear all cached data (logout scenario)
  Future<void> clearAllCache() async {
    await clearSession();
    await clearUserProfile();
    await clearTournaments();
    await clearMatches();
    await clearPlayers();
    print('🗑️ All cache cleared');
  }

  /// Check if any cached data exists
  Future<bool> hasCachedData() async {
    final hasSession = await getAccessToken() != null;
    final hasProfile = await getUserProfile() != null;
    return hasSession && hasProfile;
  }

  /// Get cache statistics (useful for debugging)
  Future<Map<String, dynamic>> getCacheStats() async {
    final hasSession = await getAccessToken() != null;
    final isSessionValid = await this.isSessionValid();
    final sessionCachedAt = await getSessionCachedAt();
    final hasProfile = await getUserProfile() != null;
    final tournaments = await getTournaments();
    final matches = await getMatches();
    final players = await getPlayers();

    return {
      'has_session': hasSession,
      'session_valid': isSessionValid,
      'session_cached_at': sessionCachedAt?.toIso8601String(),
      'has_profile': hasProfile,
      'tournaments_count': tournaments?.length ?? 0,
      'matches_count': matches?.length ?? 0,
      'players_count': players?.length ?? 0,
      'cache_version': currentCacheVersion,
    };
  }
}
