import 'dart:io';
import 'app_config.dart';

/// 🔴 SECURITY WARNING: This class bypasses SSL certificate validation
/// This should ONLY be used in development mode for testing with self-signed certificates
/// NEVER use this in production builds - it makes the app vulnerable to MITM attacks
class DevHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    if (AppConfig.isProduction) {
      throw Exception(
        '❌ CRITICAL SECURITY ERROR: Attempting to use DevHttpOverrides in production build!\n'
        'This would allow man-in-the-middle attacks and is NOT ALLOWED.',
      );
    }

    print('⚠️  DEV MODE: SSL certificate validation is DISABLED');
    print('   This allows self-signed certificates but is INSECURE');
    print('   DO NOT use this build in production!');

    return super.createHttpClient(context)
      ..badCertificateCallback =
          (X509Certificate cert, String host, int port) {
        // In development, log the certificate details
        if (AppConfig.enableDebugLogs) {
          print('⚠️  Accepting bad certificate for: $host:$port');
          print('   Subject: ${cert.subject}');
          print('   Issuer: ${cert.issuer}');
        }
        return true; // Accept all certificates in dev mode
      };
  }
}

/// Production-safe HTTP client
/// Uses default SSL validation - rejects invalid certificates
class ProductionHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    // Use default secure implementation
    return super.createHttpClient(context);
  }
}
