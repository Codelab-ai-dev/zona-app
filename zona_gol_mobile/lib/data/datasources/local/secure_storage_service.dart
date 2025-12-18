import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/constants/storage_keys.dart';
import '../../../core/errors/exceptions.dart';

/// Secure Storage Service
/// Uses flutter_secure_storage for sensitive data (tokens, user credentials)
/// Data is stored in Keychain (iOS) or Keystore (Android)
class SecureStorageService {
  static SecureStorageService? _instance;
  late final FlutterSecureStorage _storage;

  // Android options
  static const AndroidOptions _androidOptions = AndroidOptions(
    encryptedSharedPreferences: true,
  );

  // iOS options
  static const IOSOptions _iosOptions = IOSOptions(
    accessibility: KeychainAccessibility.first_unlock,
  );

  SecureStorageService._() {
    _storage = const FlutterSecureStorage(
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  /// Get singleton instance
  static SecureStorageService get instance {
    _instance ??= SecureStorageService._();
    return _instance!;
  }

  // ==================== Generic Methods ====================

  /// Write a value to secure storage
  Future<void> write(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (e) {
      throw CacheException('Failed to write to secure storage: $e');
    }
  }

  /// Read a value from secure storage
  Future<String?> read(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (e) {
      throw CacheException('Failed to read from secure storage: $e');
    }
  }

  /// Delete a value from secure storage
  Future<void> delete(String key) async {
    try {
      await _storage.delete(key: key);
    } catch (e) {
      throw CacheException('Failed to delete from secure storage: $e');
    }
  }

  /// Check if a key exists
  Future<bool> containsKey(String key) async {
    try {
      final value = await _storage.read(key: key);
      return value != null;
    } catch (e) {
      return false;
    }
  }

  /// Delete all data from secure storage
  Future<void> deleteAll() async {
    try {
      await _storage.deleteAll();
    } catch (e) {
      throw CacheException('Failed to delete all from secure storage: $e');
    }
  }

  /// Get all keys
  Future<Map<String, String>> readAll() async {
    try {
      return await _storage.readAll();
    } catch (e) {
      throw CacheException('Failed to read all from secure storage: $e');
    }
  }

  // ==================== Auth Tokens ====================

  /// Save access token
  Future<void> saveAccessToken(String token) async {
    await write(StorageKeys.accessToken, token);
  }

  /// Get access token
  Future<String?> getAccessToken() async {
    return await read(StorageKeys.accessToken);
  }

  /// Delete access token
  Future<void> deleteAccessToken() async {
    await delete(StorageKeys.accessToken);
  }

  /// Save refresh token
  Future<void> saveRefreshToken(String token) async {
    await write(StorageKeys.refreshToken, token);
  }

  /// Get refresh token
  Future<String?> getRefreshToken() async {
    return await read(StorageKeys.refreshToken);
  }

  /// Delete refresh token
  Future<void> deleteRefreshToken() async {
    await delete(StorageKeys.refreshToken);
  }

  // ==================== User Data ====================

  /// Save user ID
  Future<void> saveUserId(String userId) async {
    await write(StorageKeys.userId, userId);
  }

  /// Get user ID
  Future<String?> getUserId() async {
    return await read(StorageKeys.userId);
  }

  /// Save user email
  Future<void> saveUserEmail(String email) async {
    await write(StorageKeys.userEmail, email);
  }

  /// Get user email
  Future<String?> getUserEmail() async {
    return await read(StorageKeys.userEmail);
  }

  /// Save user role
  Future<void> saveUserRole(String role) async {
    await write(StorageKeys.userRole, role);
  }

  /// Get user role
  Future<String?> getUserRole() async {
    return await read(StorageKeys.userRole);
  }

  // ==================== Session Management ====================

  /// Save session expiry
  Future<void> saveSessionExpiry(DateTime expiry) async {
    await write(StorageKeys.sessionExpiry, expiry.toIso8601String());
  }

  /// Get session expiry
  Future<DateTime?> getSessionExpiry() async {
    final expiryStr = await read(StorageKeys.sessionExpiry);
    if (expiryStr == null) return null;
    try {
      return DateTime.parse(expiryStr);
    } catch (e) {
      return null;
    }
  }

  /// Check if session is expired
  Future<bool> isSessionExpired() async {
    final expiry = await getSessionExpiry();
    if (expiry == null) return true;
    return DateTime.now().isAfter(expiry);
  }

  /// Delete session expiry
  Future<void> deleteSessionExpiry() async {
    await delete(StorageKeys.sessionExpiry);
  }

  // ==================== Complete Session Management ====================

  /// Save complete auth session
  Future<void> saveAuthSession({
    required String accessToken,
    required String refreshToken,
    required String userId,
    required String email,
    required String role,
    required DateTime expiresAt,
  }) async {
    await Future.wait([
      saveAccessToken(accessToken),
      saveRefreshToken(refreshToken),
      saveUserId(userId),
      saveUserEmail(email),
      saveUserRole(role),
      saveSessionExpiry(expiresAt),
    ]);
  }

  /// Clear complete auth session
  Future<void> clearAuthSession() async {
    await Future.wait([
      deleteAccessToken(),
      deleteRefreshToken(),
      delete(StorageKeys.userId),
      delete(StorageKeys.userEmail),
      delete(StorageKeys.userRole),
      deleteSessionExpiry(),
    ]);
  }

  /// Check if user has valid session
  Future<bool> hasValidSession() async {
    final hasToken = await containsKey(StorageKeys.accessToken);
    if (!hasToken) return false;

    final expired = await isSessionExpired();
    return !expired;
  }

  // ==================== Debug ====================

  /// Print all stored keys (for debugging - only in dev)
  Future<void> printAllKeys() async {
    try {
      final all = await readAll();
      print('═══════════════════════════════════════════════');
      print('🔐 SECURE STORAGE CONTENTS');
      print('═══════════════════════════════════════════════');
      all.forEach((key, value) {
        // Mask sensitive values
        final maskedValue = _maskSensitiveValue(key, value);
        print('$key: $maskedValue');
      });
      print('Total keys: ${all.length}');
      print('═══════════════════════════════════════════════');
    } catch (e) {
      print('Error reading secure storage: $e');
    }
  }

  String _maskSensitiveValue(String key, String value) {
    // Mask tokens and sensitive data
    if (key.contains('token') || key.contains('password')) {
      if (value.length <= 10) return '***';
      return '${value.substring(0, 4)}...${value.substring(value.length - 4)}';
    }
    return value;
  }
}
