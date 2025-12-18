import 'package:supabase_flutter/supabase_flutter.dart';
import 'app_config.dart';

class SupabaseConfig {
  // 🔒 SECURITY: Default values for DEVELOPMENT ONLY
  // In production, these MUST be overridden via --dart-define flags
  static const String _defaultSupabaseUrl = 'https://srv1190257.hstgr.cloud';
  static const String _defaultSupabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY1Mzg4OTkyLCJleHAiOjIwODA3NDg5OTJ9.o4ltxPTWM3ij5MrUvpZF86FuQK1qXwTRugmJzO0OoNY';

  // Get configuration from environment or use defaults in dev
  static String get supabaseUrl {
    if (AppConfig.supabaseUrl.isNotEmpty) {
      return AppConfig.supabaseUrl;
    }

    if (AppConfig.isProduction) {
      throw Exception(
        '❌ PRODUCTION ERROR: SUPABASE_URL must be provided via --dart-define',
      );
    }

    // Development mode - use default
    return _defaultSupabaseUrl;
  }

  static String get supabaseAnonKey {
    if (AppConfig.supabaseAnonKey.isNotEmpty) {
      return AppConfig.supabaseAnonKey;
    }

    if (AppConfig.isProduction) {
      throw Exception(
        '❌ PRODUCTION ERROR: SUPABASE_ANON_KEY must be provided via --dart-define',
      );
    }

    // Development mode - use default
    return _defaultSupabaseAnonKey;
  }

  static late SupabaseClient client;

  static Future<void> initialize() async {
    // Validate environment configuration first
    AppConfig.validate();

    if (AppConfig.enableDebugLogs) {
      print('🔵 Initializing Supabase...');
      print('   URL: $supabaseUrl');
      print('   Key: ${supabaseAnonKey.substring(0, 20)}...[REDACTED]');
    }

    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    );

    client = Supabase.instance.client;

    if (AppConfig.enableDebugLogs) {
      print('✅ Supabase initialized successfully');
    }
  }
}
