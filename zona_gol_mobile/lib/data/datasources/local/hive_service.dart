import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/constants/storage_keys.dart';
import '../../../core/errors/exceptions.dart';

/// Hive Service for Local Caching
/// Uses Hive for structured local storage (offline data)
class HiveService {
  static HiveService? _instance;
  static bool _initialized = false;

  // Box references
  Box? _leaguesBox;
  Box? _tournamentsBox;
  Box? _teamsBox;
  Box? _playersBox;
  Box? _matchesBox;
  Box? _statsBox;
  Box? _syncQueueBox;
  Box? _userProfileBox;
  Box? _settingsBox;

  HiveService._();

  /// Get singleton instance
  static HiveService get instance {
    _instance ??= HiveService._();
    return _instance!;
  }

  /// Initialize Hive
  static Future<void> initialize() async {
    if (_initialized) {
      print('⚠️ Hive already initialized');
      return;
    }

    try {
      print('🔄 Initializing Hive...');

      // Initialize Hive
      await Hive.initFlutter();

      print('✅ Hive initialized successfully');
      _initialized = true;
    } catch (e, stackTrace) {
      print('❌ Failed to initialize Hive: $e');
      print('Stack trace: $stackTrace');
      throw CacheException('Failed to initialize Hive: $e');
    }
  }

  /// Open all boxes
  Future<void> openBoxes() async {
    try {
      print('🔄 Opening Hive boxes...');

      _leaguesBox = await Hive.openBox(StorageKeys.leaguesBox);
      _tournamentsBox = await Hive.openBox(StorageKeys.tournamentsBox);
      _teamsBox = await Hive.openBox(StorageKeys.teamsBox);
      _playersBox = await Hive.openBox(StorageKeys.playersBox);
      _matchesBox = await Hive.openBox(StorageKeys.matchesBox);
      _statsBox = await Hive.openBox(StorageKeys.statsBox);
      _syncQueueBox = await Hive.openBox(StorageKeys.syncQueueBox);
      _userProfileBox = await Hive.openBox(StorageKeys.userProfileBox);
      _settingsBox = await Hive.openBox(StorageKeys.settingsBox);

      print('✅ All Hive boxes opened successfully');
    } catch (e) {
      throw CacheException('Failed to open Hive boxes: $e');
    }
  }

  /// Close all boxes
  Future<void> closeBoxes() async {
    try {
      await _leaguesBox?.close();
      await _tournamentsBox?.close();
      await _teamsBox?.close();
      await _playersBox?.close();
      await _matchesBox?.close();
      await _statsBox?.close();
      await _syncQueueBox?.close();
      await _userProfileBox?.close();
      await _settingsBox?.close();

      print('✅ All Hive boxes closed');
    } catch (e) {
      print('⚠️ Error closing Hive boxes: $e');
    }
  }

  // ==================== Generic Box Operations ====================

  /// Get box by name
  Box? _getBox(String boxName) {
    switch (boxName) {
      case StorageKeys.leaguesBox:
        return _leaguesBox;
      case StorageKeys.tournamentsBox:
        return _tournamentsBox;
      case StorageKeys.teamsBox:
        return _teamsBox;
      case StorageKeys.playersBox:
        return _playersBox;
      case StorageKeys.matchesBox:
        return _matchesBox;
      case StorageKeys.statsBox:
        return _statsBox;
      case StorageKeys.syncQueueBox:
        return _syncQueueBox;
      case StorageKeys.userProfileBox:
        return _userProfileBox;
      case StorageKeys.settingsBox:
        return _settingsBox;
      default:
        return null;
    }
  }

  /// Put value in box
  Future<void> put(String boxName, dynamic key, dynamic value) async {
    try {
      final box = _getBox(boxName);
      if (box == null) {
        throw CacheException('Box $boxName not found');
      }
      await box.put(key, value);
    } catch (e) {
      throw CacheException('Failed to put value in box: $e');
    }
  }

  /// Get value from box
  dynamic get(String boxName, dynamic key, {dynamic defaultValue}) {
    try {
      final box = _getBox(boxName);
      if (box == null) {
        throw CacheException('Box $boxName not found');
      }
      return box.get(key, defaultValue: defaultValue);
    } catch (e) {
      throw CacheException('Failed to get value from box: $e');
    }
  }

  /// Delete value from box
  Future<void> deleteKey(String boxName, dynamic key) async {
    try {
      final box = _getBox(boxName);
      if (box == null) {
        throw CacheException('Box $boxName not found');
      }
      await box.delete(key);
    } catch (e) {
      throw CacheException('Failed to delete value from box: $e');
    }
  }

  /// Clear entire box
  Future<void> clearBox(String boxName) async {
    try {
      final box = _getBox(boxName);
      if (box == null) {
        throw CacheException('Box $boxName not found');
      }
      await box.clear();
    } catch (e) {
      throw CacheException('Failed to clear box: $e');
    }
  }

  /// Get all values from box
  List<dynamic> getAll(String boxName) {
    try {
      final box = _getBox(boxName);
      if (box == null) {
        throw CacheException('Box $boxName not found');
      }
      return box.values.toList();
    } catch (e) {
      throw CacheException('Failed to get all values from box: $e');
    }
  }

  /// Get all keys from box
  List<dynamic> getAllKeys(String boxName) {
    try {
      final box = _getBox(boxName);
      if (box == null) {
        throw CacheException('Box $boxName not found');
      }
      return box.keys.toList();
    } catch (e) {
      throw CacheException('Failed to get all keys from box: $e');
    }
  }

  /// Check if key exists in box
  bool containsKey(String boxName, dynamic key) {
    try {
      final box = _getBox(boxName);
      if (box == null) return false;
      return box.containsKey(key);
    } catch (e) {
      return false;
    }
  }

  // ==================== Specific Box Operations ====================

  // Leagues
  Future<void> saveLeague(String id, Map<String, dynamic> league) async {
    await put(StorageKeys.leaguesBox, id, league);
  }

  Map<String, dynamic>? getLeague(String id) {
    final result = get(StorageKeys.leaguesBox, id);
    return result != null ? Map<String, dynamic>.from(result) : null;
  }

  List<Map<String, dynamic>> getAllLeagues() {
    final leagues = getAll(StorageKeys.leaguesBox);
    return leagues
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  // Tournaments
  Future<void> saveTournament(String id, Map<String, dynamic> tournament) async {
    await put(StorageKeys.tournamentsBox, id, tournament);
  }

  Map<String, dynamic>? getTournament(String id) {
    final result = get(StorageKeys.tournamentsBox, id);
    return result != null ? Map<String, dynamic>.from(result) : null;
  }

  List<Map<String, dynamic>> getAllTournaments() {
    final tournaments = getAll(StorageKeys.tournamentsBox);
    return tournaments
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  // Teams
  Future<void> saveTeam(String id, Map<String, dynamic> team) async {
    await put(StorageKeys.teamsBox, id, team);
  }

  Map<String, dynamic>? getTeam(String id) {
    final result = get(StorageKeys.teamsBox, id);
    return result != null ? Map<String, dynamic>.from(result) : null;
  }

  // Players
  Future<void> savePlayer(String id, Map<String, dynamic> player) async {
    await put(StorageKeys.playersBox, id, player);
  }

  Map<String, dynamic>? getPlayer(String id) {
    final result = get(StorageKeys.playersBox, id);
    return result != null ? Map<String, dynamic>.from(result) : null;
  }

  // Matches
  Future<void> saveMatch(String id, Map<String, dynamic> match) async {
    await put(StorageKeys.matchesBox, id, match);
  }

  Map<String, dynamic>? getMatch(String id) {
    final result = get(StorageKeys.matchesBox, id);
    return result != null ? Map<String, dynamic>.from(result) : null;
  }

  List<Map<String, dynamic>> getAllMatches() {
    final matches = getAll(StorageKeys.matchesBox);
    return matches
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  // Sync Queue
  Future<void> addToSyncQueue(Map<String, dynamic> item) async {
    final queue = _syncQueueBox;
    if (queue == null) return;

    final id = DateTime.now().millisecondsSinceEpoch.toString();
    await queue.put(id, item);
  }

  List<Map<String, dynamic>> getSyncQueue() {
    final queue = getAll(StorageKeys.syncQueueBox);
    return queue
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  Future<void> clearSyncQueue() async {
    await clearBox(StorageKeys.syncQueueBox);
  }

  // User Profile
  Future<void> saveUserProfile(Map<String, dynamic> profile) async {
    await put(StorageKeys.userProfileBox, 'profile', profile);
  }

  Map<String, dynamic>? getUserProfile() {
    final result = get(StorageKeys.userProfileBox, 'profile');
    return result != null ? Map<String, dynamic>.from(result) : null;
  }

  // Settings
  Future<void> saveSetting(String key, dynamic value) async {
    await put(StorageKeys.settingsBox, key, value);
  }

  dynamic getSetting(String key, {dynamic defaultValue}) {
    return get(StorageKeys.settingsBox, key, defaultValue: defaultValue);
  }

  // ==================== Cache Management ====================

  /// Clear all cache
  Future<void> clearAllCache() async {
    await Future.wait([
      clearBox(StorageKeys.leaguesBox),
      clearBox(StorageKeys.tournamentsBox),
      clearBox(StorageKeys.teamsBox),
      clearBox(StorageKeys.playersBox),
      clearBox(StorageKeys.matchesBox),
      clearBox(StorageKeys.statsBox),
    ]);
    print('✅ All cache cleared');
  }

  /// Clear expired cache (based on TTL)
  Future<void> clearExpiredCache() async {
    // TODO: Implement TTL-based cache clearing
    // This would require storing metadata with each cached item
    print('⚠️ clearExpiredCache not yet implemented');
  }

  /// Get cache size
  int getCacheSize() {
    int totalSize = 0;
    totalSize += _leaguesBox?.length ?? 0;
    totalSize += _tournamentsBox?.length ?? 0;
    totalSize += _teamsBox?.length ?? 0;
    totalSize += _playersBox?.length ?? 0;
    totalSize += _matchesBox?.length ?? 0;
    totalSize += _statsBox?.length ?? 0;
    return totalSize;
  }

  /// Print debug info
  void printDebugInfo() {
    print('═══════════════════════════════════════════════');
    print('💾 HIVE CACHE INFO');
    print('═══════════════════════════════════════════════');
    print('Initialized:     $_initialized');
    print('Leagues:         ${_leaguesBox?.length ?? 0}');
    print('Tournaments:     ${_tournamentsBox?.length ?? 0}');
    print('Teams:           ${_teamsBox?.length ?? 0}');
    print('Players:         ${_playersBox?.length ?? 0}');
    print('Matches:         ${_matchesBox?.length ?? 0}');
    print('Stats:           ${_statsBox?.length ?? 0}');
    print('Sync Queue:      ${_syncQueueBox?.length ?? 0}');
    print('Total Size:      ${getCacheSize()} items');
    print('═══════════════════════════════════════════════');
  }
}
