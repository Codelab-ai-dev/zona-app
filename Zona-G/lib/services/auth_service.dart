import '../models/user.dart';
import '../config/supabase_config.dart';
import 'offline_session_manager.dart';
import 'connectivity_service.dart';
import 'cache_service.dart';

class AuthService {
  // Current authenticated user
  static AppUser? _currentUser;

  // Offline services
  static final OfflineSessionManager _sessionManager = OfflineSessionManager();
  static final ConnectivityService _connectivity = ConnectivityService();

  // Get current user
  static AppUser? get currentUser => _currentUser;

  // Check if user is authenticated
  static bool get isAuthenticated => _currentUser != null;

  // Check if current user is league admin
  static bool get isLeagueAdmin => _currentUser?.isLeagueAdmin ?? false;

  // Check if currently offline
  static bool get isOffline => !_connectivity.isOnline;

  // Login with email and password
  static Future<AppUser?> login(String email, String password) async {
    try {
      print('🔐 Intentando login para: $email');

      // Check if online
      if (!_connectivity.isOnline) {
        throw Exception(
          'No hay conexión a internet. Para iniciar sesión por primera vez necesitas estar conectado.',
        );
      }

      // Authenticate with Supabase Auth
      final authResponse = await SupabaseConfig.client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (authResponse.user == null) {
        print('❌ Error: Usuario no autenticado');
        return null;
      }

      // Get user profile from users table
      final userResponse = await SupabaseConfig.client
          .from('users')
          .select('''
            *,
            league:leagues!users_league_id_fkey(id, name)
          ''')
          .eq('id', authResponse.user!.id)
          .single();

      final user = AppUser.fromJson(userResponse);

      // Check if user has allowed role
      if (!user.isLeagueAdmin && !user.isSuperAdmin && !user.isTeamOwner) {
        print('❌ Error: Usuario no tiene permisos (Role: ${user.role})');
        await logout(); // Sign out if not allowed
        throw Exception(
          'No tienes permisos para acceder a la aplicación. Rol actual: ${user.roleText}',
        );
      }

      _currentUser = user;

      // ✅ CACHE SESSION FOR OFFLINE USE
      await _sessionManager.cacheCurrentSession();

      // Cache user profile
      await _sessionManager.cacheUserProfile({
        'id': user.id,
        'role': user.role.name,
        'league_id': user.leagueId,
        'team_id': user.teamId,
        'name': user.name,
        'email': user.email,
      });

      print('✅ Login exitoso: ${user.name} (${user.roleText})');
      print('✅ Sesión y perfil cacheados para uso offline');

      return user;
    } catch (e) {
      print('❌ Error en login: $e');
      rethrow;
    }
  }

  // Logout
  static Future<void> logout() async {
    try {
      await SupabaseConfig.client.auth.signOut();
      _currentUser = null;

      // ✅ CLEAR ALL OFFLINE CACHE ON LOGOUT
      await _sessionManager.clearOfflineData();

      print('✅ Logout exitoso y cache limpiado');
    } catch (e) {
      print('❌ Error en logout: $e');
      _currentUser = null; // Clear user anyway

      // Try to clear cache even if logout fails
      try {
        await _sessionManager.clearOfflineData();
      } catch (cacheError) {
        print('⚠️ Error limpiando cache: $cacheError');
      }
    }
  }

  // Check if user session is valid (supports offline mode)
  static Future<AppUser?> getCurrentUserSession() async {
    try {
      final isOnline = _connectivity.isOnline;

      if (isOnline) {
        // ONLINE: Get fresh session from Supabase
        final session = SupabaseConfig.client.auth.currentSession;
        if (session?.user == null) {
          _currentUser = null;
          return null;
        }

        // Get fresh user data
        final userResponse = await SupabaseConfig.client
            .from('users')
            .select('''
              *,
              league:leagues!users_league_id_fkey(id, name)
            ''')
            .eq('id', session!.user.id)
            .single();

        final user = AppUser.fromJson(userResponse);

        // Verify user has allowed role
        if (!user.isLeagueAdmin && !user.isSuperAdmin && !user.isTeamOwner) {
          await logout();
          return null;
        }

        _currentUser = user;

        // Update cache with fresh data
        await _sessionManager.cacheCurrentSession();
        await _sessionManager.cacheUserProfile({
          'id': user.id,
          'role': user.role.name,
          'league_id': user.leagueId,
          'team_id': user.teamId,
          'name': user.name,
          'email': user.email,
        });

        return user;
      } else {
        // OFFLINE: Try to load from cache
        print('📵 Modo offline: cargando sesión desde cache');

        final isSessionValid = await _sessionManager.isOfflineModeAvailable();
        if (!isSessionValid) {
          print('⚠️ No hay sesión cacheada válida');
          _currentUser = null;
          return null;
        }

        // Load cached profile
        final cachedProfile = await _sessionManager.getCachedUserProfile();
        if (cachedProfile == null) {
          print('⚠️ No se encontró perfil en cache');
          _currentUser = null;
          return null;
        }

        // Reconstruct user from cache (simplified - doesn't include league object)
        final user = AppUser(
          id: cachedProfile['id'] as String,
          email: cachedProfile['email'] as String? ?? '',
          name: cachedProfile['name'] as String? ?? 'Usuario',
          role: UserRole.values.firstWhere(
            (e) => e.name == cachedProfile['role'],
            orElse: () => UserRole.public,
          ),
          leagueId: cachedProfile['league_id'] as String?,
          teamId: cachedProfile['team_id'] as String?,
          createdAt: DateTime.now(), // Placeholder
          updatedAt: DateTime.now(), // Placeholder
        );

        _currentUser = user;
        print('✅ Sesión cargada desde cache (offline)');

        return user;
      }
    } catch (e) {
      print('❌ Error verificando sesión: $e');
      _currentUser = null;
      return null;
    }
  }

  // Get tournaments for current user's league (supports offline mode)
  static Future<List<Map<String, dynamic>>> getUserTournaments() async {
    if (_currentUser?.leagueId == null) {
      print('❌ Error: Usuario sin liga asignada');
      return [];
    }

    final isOnline = _connectivity.isOnline;

    if (isOnline) {
      // ONLINE: Fetch fresh data and cache it
      try {
        print('🏆 Obteniendo torneos para liga: ${_currentUser!.leagueId}');

        final response = await SupabaseConfig.client
            .from('tournaments')
            .select('''
              *,
              league:leagues!tournaments_league_id_fkey(id, name)
            ''')
            .eq('league_id', _currentUser!.leagueId!)
            .order('created_at', ascending: false);

        final tournaments = List<Map<String, dynamic>>.from(response);

        // ✅ CACHE TOURNAMENTS FOR OFFLINE USE
        await _sessionManager.cacheUserProfile({
          'id': _currentUser!.id,
          'role': _currentUser!.role.name,
          'league_id': _currentUser!.leagueId,
          'team_id': _currentUser!.teamId,
          'name': _currentUser!.name,
          'email': _currentUser!.email,
        });

        // Cache tournaments using CacheService directly
        final cacheService = CacheService();
        await cacheService.cacheTournaments(tournaments);

        print('✅ Torneos obtenidos y cacheados: ${tournaments.length}');
        return tournaments;
      } catch (e) {
        print('❌ Error obteniendo torneos: $e');

        // Try to fallback to cache on error
        print('🔄 Intentando cargar torneos desde cache...');
        final cacheService = CacheService();
        final cachedTournaments = await cacheService.getTournaments();

        if (cachedTournaments != null) {
          print('✅ Torneos cargados desde cache: ${cachedTournaments.length}');
          return cachedTournaments;
        }

        return [];
      }
    } else {
      // OFFLINE: Load from cache
      try {
        print('📵 Modo offline: cargando torneos desde cache');

        final cacheService = CacheService();
        final cachedTournaments = await cacheService.getTournaments();

        if (cachedTournaments != null) {
          print('✅ Torneos cargados desde cache: ${cachedTournaments.length}');
          return cachedTournaments;
        } else {
          print('⚠️ No hay torneos en cache');
          return [];
        }
      } catch (e) {
        print('❌ Error cargando torneos desde cache: $e');
        return [];
      }
    }
  }

  // Update user's last activity
  static Future<void> updateLastActivity() async {
    if (_currentUser == null) return;

    try {
      await SupabaseConfig.client
          .from('users')
          .update({'updated_at': DateTime.now().toIso8601String()})
          .eq('id', _currentUser!.id);
    } catch (e) {
      print('⚠️ Error actualizando actividad: $e');
      // Non-critical error, don't fail
    }
  }

  // Get user's league info
  static Future<Map<String, dynamic>?> getUserLeague() async {
    if (_currentUser?.leagueId == null) return null;

    try {
      final response = await SupabaseConfig.client
          .from('leagues')
          .select('*')
          .eq('id', _currentUser!.leagueId!)
          .single();

      return response;
    } catch (e) {
      print('❌ Error obteniendo liga: $e');
      return null;
    }
  }

  // Validate email format
  static bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  // Validate password strength
  static bool isValidPassword(String password) {
    return password.length >= 6;
  }
}
