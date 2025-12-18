/// App Configuration
/// Handles environment-specific configuration
class AppConfig {
  // Environment
  static const String environment = String.fromEnvironment('ENV', defaultValue: 'dev');

  // Supabase Configuration
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://srv1190257.hstgr.cloud',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY1Mzg4OTkyLCJleHAiOjIwODA3NDg5OTJ9.o4ltxPTWM3ij5MrUvpZF86FuQK1qXwTRugmJzO0OoNY',
  );

  // Environment Checks
  static bool get isDevelopment => environment == 'dev';
  static bool get isStaging => environment == 'staging';
  static bool get isProduction => environment == 'prod';

  // Features Flags
  static bool get enableOfflineMode => true;
  static bool get enablePushNotifications => isProduction || isStaging;
  static bool get enableAnalytics => isProduction;
  static bool get enableCrashReporting => isProduction || isStaging;

  // Timeouts
  static const Duration apiTimeout = Duration(seconds: 30);
  static const Duration cacheTimeout = Duration(hours: 24);
  static const Duration sessionTimeout = Duration(hours: 48);

  // Cache TTL
  static const Duration leaguesCacheTTL = Duration(hours: 24);
  static const Duration tournamentsCacheTTL = Duration(hours: 12);
  static const Duration matchesCacheTTL = Duration(hours: 6);
  static const Duration statsCacheTTL = Duration(hours: 1);

  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // Validation
  static void validate() {
    if (isProduction) {
      if (supabaseUrl.isEmpty) {
        throw Exception('SUPABASE_URL must be provided in production');
      }
      if (supabaseAnonKey.isEmpty) {
        throw Exception('SUPABASE_ANON_KEY must be provided in production');
      }
    }
  }

  // Debug Info
  static void printConfig() {
    if (!isProduction) {
      print('═══════════════════════════════════════════════');
      print('🔧 APP CONFIGURATION');
      print('═══════════════════════════════════════════════');
      print('Environment:           $environment');
      print('Is Production:         $isProduction');
      print('Offline Mode:          $enableOfflineMode');
      print('Push Notifications:    $enablePushNotifications');
      print('Analytics:             $enableAnalytics');
      print('Supabase URL:          ${supabaseUrl.isNotEmpty ? "✓" : "✗"}');
      print('Supabase Key:          ${supabaseAnonKey.isNotEmpty ? "✓" : "✗"}');
      print('═══════════════════════════════════════════════');
    }
  }
}
