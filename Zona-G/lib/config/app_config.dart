/// Application configuration based on build environment
/// Uses --dart-define flags to determine environment
///
/// Usage:
///   flutter run --dart-define=ENV=dev
///   flutter build apk --dart-define=ENV=prod --dart-define=SUPABASE_URL=https://... --dart-define=SUPABASE_ANON_KEY=...
class AppConfig {
  // Environment configuration
  static const String environment = String.fromEnvironment(
    'ENV',
    defaultValue: 'dev', // Default to dev for safety
  );

  // Supabase configuration from environment variables
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '', // Will use default in dev
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '', // Will use default in dev
  );

  // Environment checks
  static bool get isDevelopment => environment == 'dev';
  static bool get isProduction => environment == 'prod';
  static bool get isStaging => environment == 'staging';

  // Security settings based on environment
  static bool get allowSSLBypass => isDevelopment; // ONLY in dev
  static bool get allowCleartextTraffic => isDevelopment; // ONLY in dev
  static bool get enableDebugLogs => isDevelopment || isStaging;

  // Get current configuration summary
  static Map<String, dynamic> getConfigSummary() {
    return {
      'environment': environment,
      'is_development': isDevelopment,
      'is_production': isProduction,
      'is_staging': isStaging,
      'allow_ssl_bypass': allowSSLBypass,
      'allow_cleartext': allowCleartextTraffic,
      'debug_logs_enabled': enableDebugLogs,
      'supabase_url_configured': supabaseUrl.isNotEmpty,
      'supabase_key_configured': supabaseAnonKey.isNotEmpty,
    };
  }

  /// Validate configuration before app starts
  /// Throws exception if production build is misconfigured
  static void validate() {
    if (isProduction) {
      // Production MUST have Supabase URL and key configured
      if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
        throw Exception(
          '❌ PRODUCTION BUILD ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be provided via --dart-define flags\n'
          'Example: flutter build apk --dart-define=ENV=prod --dart-define=SUPABASE_URL=https://... --dart-define=SUPABASE_ANON_KEY=...',
        );
      }

      // Production MUST NOT allow SSL bypass
      if (allowSSLBypass) {
        throw Exception(
          '❌ SECURITY ERROR: SSL bypass is enabled in production build! This should never happen.',
        );
      }

      // Production MUST NOT allow cleartext traffic
      if (allowCleartextTraffic) {
        throw Exception(
          '❌ SECURITY ERROR: Cleartext traffic is allowed in production build! This should never happen.',
        );
      }

      print('✅ Production build validated: All security checks passed');
    } else if (isDevelopment) {
      print('⚠️ Development mode: SSL bypass and cleartext traffic ALLOWED');
      print('   DO NOT use this build in production!');
    }
  }

  /// Pretty print configuration
  static void printConfig() {
    final config = getConfigSummary();
    print('\n═══════════════════════════════════════════════');
    print('🔧 APP CONFIGURATION');
    print('═══════════════════════════════════════════════');
    print('Environment:           ${config['environment']}');
    print('Is Production:         ${config['is_production']}');
    print('SSL Bypass Allowed:    ${config['allow_ssl_bypass']} ${config['allow_ssl_bypass'] ? '⚠️' : '✅'}');
    print('Cleartext Allowed:     ${config['allow_cleartext']} ${config['allow_cleartext'] ? '⚠️' : '✅'}');
    print('Debug Logs:            ${config['debug_logs_enabled']}');
    print('Supabase Configured:   ${config['supabase_url_configured'] && config['supabase_key_configured']}');
    print('═══════════════════════════════════════════════\n');
  }
}
