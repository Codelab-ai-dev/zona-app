import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/config/app_config.dart';
import '../../../core/errors/exceptions.dart' as core;

/// Supabase Client Singleton
/// Provides access to Supabase services: Auth, Database, Storage, Realtime
class SupabaseClientService {
  static SupabaseClientService? _instance;
  static SupabaseClient? _client;
  static bool _initialized = false;

  SupabaseClientService._();

  /// Get singleton instance
  static SupabaseClientService get instance {
    _instance ??= SupabaseClientService._();
    return _instance!;
  }

  /// Initialize Supabase
  static Future<void> initialize() async {
    if (_initialized) {
      print('⚠️ Supabase already initialized');
      return;
    }

    try {
      // Validate configuration
      AppConfig.validate();

      print('🔄 Initializing Supabase...');
      print('   URL: ${AppConfig.supabaseUrl}');
      print('   Environment: ${AppConfig.environment}');

      await Supabase.initialize(
        url: AppConfig.supabaseUrl,
        anonKey: AppConfig.supabaseAnonKey,
        authOptions: const FlutterAuthClientOptions(
          authFlowType: AuthFlowType.pkce,
          autoRefreshToken: true,
        ),
        realtimeClientOptions: const RealtimeClientOptions(
          logLevel: RealtimeLogLevel.info,
        ),
        storageOptions: const StorageClientOptions(
          retryAttempts: 3,
        ),
      );

      _client = Supabase.instance.client;
      _initialized = true;

      print('✅ Supabase initialized successfully');
      print('   Auth URL: ${_client!.auth.currentUser?.id ?? "No user"}');
    } catch (e, stackTrace) {
      print('❌ Failed to initialize Supabase: $e');
      print('Stack trace: $stackTrace');
      throw core.ServerException('Failed to initialize Supabase: $e');
    }
  }

  /// Get Supabase client
  SupabaseClient get client {
    if (!_initialized || _client == null) {
      throw core.ServerException('Supabase not initialized. Call initialize() first.');
    }
    return _client!;
  }

  /// Get Auth client
  GoTrueClient get auth => client.auth;

  /// Get Database client (for queries)
  PostgrestClient get database => client.rest;

  /// Get Storage client
  SupabaseStorageClient get storage => client.storage;

  /// Get Realtime client
  RealtimeClient get realtime => client.realtime;

  /// Get Functions client
  FunctionsClient get functions => client.functions;

  // Convenience methods for common operations

  /// Execute a database query
  SupabaseQueryBuilder from(String table) {
    return client.from(table);
  }

  /// Execute a stored procedure/function
  Future<PostgrestResponse> rpc(
    String fn, {
    Map<String, dynamic>? params,
  }) async {
    try {
      return await client.rpc(fn, params: params);
    } catch (e) {
      throw core.ServerException('RPC call failed: $e');
    }
  }

  /// Get file from storage bucket
  String getPublicUrl(String bucket, String path) {
    try {
      return client.storage.from(bucket).getPublicUrl(path);
    } catch (e) {
      throw core.ServerException('Failed to get public URL: $e');
    }
  }

  /// Upload file to storage
  Future<String> uploadFile({
    required String bucket,
    required String path,
    required dynamic file,
    Map<String, String>? metadata,
  }) async {
    try {
      await client.storage.from(bucket).upload(
            path,
            file,
            fileOptions: FileOptions(
              upsert: true,
              contentType: metadata?['contentType'],
            ),
          );

      return getPublicUrl(bucket, path);
    } catch (e) {
      throw core.ServerException('File upload failed: $e');
    }
  }

  /// Delete file from storage
  Future<void> deleteFile({
    required String bucket,
    required String path,
  }) async {
    try {
      await client.storage.from(bucket).remove([path]);
    } catch (e) {
      throw core.ServerException('File deletion failed: $e');
    }
  }

  /// Subscribe to realtime changes
  RealtimeChannel channel(String channelName) {
    return client.channel(channelName);
  }

  /// Remove all realtime subscriptions
  Future<void> removeAllChannels() async {
    await client.removeAllChannels();
  }

  /// Check if user is authenticated
  bool get isAuthenticated => client.auth.currentUser != null;

  /// Get current user
  User? get currentUser => client.auth.currentUser;

  /// Get current session
  Session? get currentSession => client.auth.currentSession;

  /// Sign out
  Future<void> signOut() async {
    try {
      await client.auth.signOut();
    } catch (e) {
      throw core.AuthException('Sign out failed: $e');
    }
  }

  /// Dispose resources
  void dispose() {
    _client?.dispose();
    _initialized = false;
    _client = null;
  }

  /// Debug info
  void printDebugInfo() {
    if (!AppConfig.isProduction) {
      print('═══════════════════════════════════════════════');
      print('🔧 SUPABASE CLIENT INFO');
      print('═══════════════════════════════════════════════');
      print('Initialized:        $_initialized');
      print('Authenticated:      $isAuthenticated');
      print('Current User ID:    ${currentUser?.id ?? "None"}');
      print('Current User Email: ${currentUser?.email ?? "None"}');
      print('Session Expires:    ${currentSession?.expiresAt ?? "None"}');
      print('Environment:        ${AppConfig.environment}');
      print('═══════════════════════════════════════════════');
    }
  }
}

/// Global getter for convenience
SupabaseClient get supabase => SupabaseClientService.instance.client;
