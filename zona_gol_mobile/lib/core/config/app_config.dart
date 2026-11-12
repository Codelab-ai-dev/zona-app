/// App Configuration (compile-time `--dart-define` values).
class AppConfig {
  // Environment
  static const String environment = String.fromEnvironment('ENV', defaultValue: 'dev');

  /// Zona Gol API origin (without `/api/v1`). Local defaults: the iOS
  /// simulator reaches the Mac as localhost; the Android emulator needs
  /// `--dart-define=API_BASE_URL=http://10.0.2.2:8080`; a phone needs the
  /// Mac's LAN address.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8080',
  );

  /// Public site (links shared from the app).
  static const String webBaseUrl = String.fromEnvironment(
    'WEB_BASE_URL',
    defaultValue: 'http://localhost:8088',
  );

  // Environment Checks
  static bool get isDevelopment => environment == 'dev';
  static bool get isStaging => environment == 'staging';
  static bool get isProduction => environment == 'prod';

  // Timeouts
  static const Duration apiTimeout = Duration(seconds: 30);

  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  /// Production builds must point to an HTTPS API.
  static void validate() {
    if (isProduction && !apiBaseUrl.startsWith('https://')) {
      throw Exception('API_BASE_URL must be an https:// URL in production');
    }
  }

  // Debug Info
  static void printConfig() {
    if (!isProduction) {
      // ignore: avoid_print
      print('Zona Gol · env=$environment · api=$apiBaseUrl');
    }
  }
}
