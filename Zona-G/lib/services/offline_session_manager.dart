import 'package:supabase_flutter/supabase_flutter.dart';
import 'cache_service.dart';
import 'connectivity_service.dart';

/// Manages offline session lifecycle and validation
/// Handles session caching, validation, and re-authentication
class OfflineSessionManager {
  static final OfflineSessionManager _instance =
      OfflineSessionManager._internal();
  factory OfflineSessionManager() => _instance;
  OfflineSessionManager._internal();

  final CacheService _cache = CacheService();
  final ConnectivityService _connectivity = ConnectivityService();
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Initialize the offline session manager
  Future<void> init() async {
    await _cache.init();
    await _connectivity.init();

    // Listen for connectivity changes to trigger sync
    _connectivity.connectivityStream.listen((isOnline) {
      if (isOnline) {
        _handleNetworkRestored();
      }
    });

    print('✅ Offline session manager initialized');
  }

  /// Check if user can access the app (online with valid session OR offline with cached session)
  Future<bool> canAccessApp() async {
    final isOnline = _connectivity.isOnline;

    if (isOnline) {
      // Online: Check if user has active Supabase session
      final session = _supabase.auth.currentSession;
      return session != null;
    } else {
      // Offline: Check if we have a valid cached session
      return await _cache.isSessionValid();
    }
  }

  /// Get current session (from Supabase if online, from cache if offline)
  Future<Session?> getSession() async {
    final isOnline = _connectivity.isOnline;

    if (isOnline) {
      return _supabase.auth.currentSession;
    } else {
      // Try to reconstruct session from cache
      final accessToken = await _cache.getAccessToken();
      final refreshToken = await _cache.getRefreshToken();

      if (accessToken == null || refreshToken == null) return null;

      // Note: This is a simplified session reconstruction
      // For offline mode, we just need the tokens to exist
      // The actual validation happens when network is restored
      return Session(
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: 3600, // Placeholder - will be validated on next online sync
        tokenType: 'bearer',
        user: User(
          id: '', // Will be populated from cached profile
          appMetadata: {},
          userMetadata: {},
          aud: 'authenticated',
          createdAt: DateTime.now().toIso8601String(),
        ),
      );
    }
  }

  /// Cache current session after successful login
  Future<void> cacheCurrentSession() async {
    final session = _supabase.auth.currentSession;
    if (session == null) {
      print('⚠️ No active session to cache');
      return;
    }

    await _cache.cacheSession(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken ?? '',
      expiresAt: DateTime.now().add(CacheService.sessionTTL),
    );

    print('✅ Session cached successfully');
  }

  /// Cache user profile data
  Future<void> cacheUserProfile(Map<String, dynamic> profile) async {
    await _cache.cacheUserProfile(profile);
  }

  /// Get cached user profile
  Future<Map<String, dynamic>?> getCachedUserProfile() async {
    return await _cache.getUserProfile();
  }

  /// Handle network restoration - attempt to refresh and sync
  Future<void> _handleNetworkRestored() async {
    print('🔄 Network restored. Attempting to refresh session...');

    try {
      // Try to refresh the session
      final refreshed = await refreshSession();

      if (refreshed) {
        print('✅ Session refreshed successfully');

        // Revalidate user profile and permissions
        await _revalidateUserData();

        // Trigger sync of pending operations (if any)
        await _syncPendingOperations();
      } else {
        print('⚠️ Failed to refresh session. User may need to re-login.');
      }
    } catch (e) {
      print('❌ Error handling network restoration: $e');
    }
  }

  /// Attempt to refresh the session using cached refresh token
  Future<bool> refreshSession() async {
    try {
      final refreshToken = await _cache.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        print('⚠️ No refresh token available');
        return false;
      }

      // Attempt to refresh using Supabase
      final response = await _supabase.auth.refreshSession();

      if (response.session != null) {
        // Cache the new session
        await cacheCurrentSession();
        print('✅ Session refreshed and cached');
        return true;
      } else {
        print('⚠️ Session refresh returned null');
        return false;
      }
    } catch (e) {
      print('❌ Error refreshing session: $e');
      return false;
    }
  }

  /// Revalidate user profile and role when back online
  Future<void> _revalidateUserData() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      // Fetch fresh user profile from database
      final response = await _supabase
          .from('users')
          .select('id, role, league_id, team_id, created_at, updated_at')
          .eq('id', userId)
          .single();

      if (response != null) {
        // Compare with cached profile to detect permission changes
        final cachedProfile = await _cache.getUserProfile();

        if (cachedProfile != null) {
          final roleChanged = cachedProfile['role'] != response['role'];
          final leagueChanged =
              cachedProfile['league_id'] != response['league_id'];
          final teamChanged = cachedProfile['team_id'] != response['team_id'];

          if (roleChanged || leagueChanged || teamChanged) {
            print('⚠️ User permissions changed! Updating cache...');
            print('   Role: ${cachedProfile['role']} → ${response['role']}');

            if (leagueChanged) {
              print(
                  '   League: ${cachedProfile['league_id']} → ${response['league_id']}');
            }
            if (teamChanged) {
              print(
                  '   Team: ${cachedProfile['team_id']} → ${response['team_id']}');
            }

            // Clear stale data that might no longer be accessible
            await _cache.clearTournaments();
            await _cache.clearMatches();
            await _cache.clearPlayers();
          }
        }

        // Update cached profile
        await _cache.cacheUserProfile(response);
        print('✅ User profile revalidated and cached');
      }
    } catch (e) {
      print('❌ Error revalidating user data: $e');
    }
  }

  /// Sync pending operations that were queued while offline
  /// This is a placeholder - implement based on your app's needs
  Future<void> _syncPendingOperations() async {
    // TODO: Implement sync queue for operations like:
    // - Player check-ins that happened offline
    // - Match data updates
    // - Any other mutations that happened offline

    print('🔄 Syncing pending operations...');

    // Example implementation:
    // 1. Check for pending operations in cache
    // 2. Attempt to send them to server
    // 3. Handle conflicts (last-write-wins or prompt user)
    // 4. Clear successfully synced operations

    // For now, just log that sync would happen here
    print('✅ Sync queue processing complete (not implemented yet)');
  }

  /// Clear all offline data (logout scenario)
  Future<void> clearOfflineData() async {
    await _cache.clearAllCache();
    print('✅ All offline data cleared');
  }

  /// Check if offline mode is available (has cached session)
  Future<bool> isOfflineModeAvailable() async {
    return await _cache.isSessionValid();
  }

  /// Get offline status summary
  Future<Map<String, dynamic>> getOfflineStatus() async {
    final isOnline = _connectivity.isOnline;
    final hasCachedSession = await _cache.isSessionValid();
    final stats = await _cache.getCacheStats();

    return {
      'is_online': isOnline,
      'offline_mode_available': hasCachedSession,
      'cache_stats': stats,
    };
  }

  /// Force a full re-sync when user manually requests it
  Future<void> forceSyncNow() async {
    if (!_connectivity.isOnline) {
      print('⚠️ Cannot sync: device is offline');
      return;
    }

    print('🔄 Manual sync requested...');

    try {
      await refreshSession();
      await _revalidateUserData();
      await _syncPendingOperations();

      print('✅ Manual sync completed successfully');
    } catch (e) {
      print('❌ Manual sync failed: $e');
      rethrow;
    }
  }
}
