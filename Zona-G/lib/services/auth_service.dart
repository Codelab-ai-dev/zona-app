import '../models/user.dart';
import '../config/supabase_config.dart';

class AuthService {
  // Current authenticated user
  static AppUser? _currentUser;
  
  // Get current user
  static AppUser? get currentUser => _currentUser;
  
  // Check if user is authenticated
  static bool get isAuthenticated => _currentUser != null;
  
  // Check if current user is league admin
  static bool get isLeagueAdmin => _currentUser?.isLeagueAdmin ?? false;

  // Login with email and password
  static Future<AppUser?> login(String email, String password) async {
    try {
      print('🔐 Intentando login para: $email');
      
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
      
      // Check if user is league admin
      if (!user.isLeagueAdmin) {
        print('❌ Error: Usuario no es administrador de liga');
        await logout(); // Sign out if not league admin
        return null;
      }

      _currentUser = user;
      print('✅ Login exitoso: ${user.name} (${user.roleText})');
      return user;

    } catch (e) {
      print('❌ Error en login: $e');
      return null;
    }
  }

  // Logout
  static Future<void> logout() async {
    try {
      await SupabaseConfig.client.auth.signOut();
      _currentUser = null;
      print('✅ Logout exitoso');
    } catch (e) {
      print('❌ Error en logout: $e');
      _currentUser = null; // Clear user anyway
    }
  }

  // Check if user session is valid
  static Future<AppUser?> getCurrentUserSession() async {
    try {
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
      
      // Verify user is still league admin
      if (!user.isLeagueAdmin) {
        await logout();
        return null;
      }

      _currentUser = user;
      return user;

    } catch (e) {
      print('❌ Error verificando sesión: $e');
      _currentUser = null;
      return null;
    }
  }

  // Get tournaments for current user's league
  static Future<List<Map<String, dynamic>>> getUserTournaments() async {
    if (_currentUser?.leagueId == null) {
      print('❌ Error: Usuario sin liga asignada');
      return [];
    }

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

      print('✅ Torneos obtenidos: ${response.length}');
      return List<Map<String, dynamic>>.from(response);

    } catch (e) {
      print('❌ Error obteniendo torneos: $e');
      return [];
    }
  }

  // Update user's last activity
  static Future<void> updateLastActivity() async {
    if (_currentUser == null) return;

    try {
      await SupabaseConfig.client
          .from('users')
          .update({
            'updated_at': DateTime.now().toIso8601String(),
          })
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