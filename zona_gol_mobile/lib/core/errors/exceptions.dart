/// Base exception class
class AppException implements Exception {
  final String message;
  final String? code;

  const AppException(this.message, [this.code]);

  @override
  String toString() => 'AppException: $message${code != null ? " (code: $code)" : ""}';
}

/// Server exception
class ServerException extends AppException {
  const ServerException(String message, [String? code]) : super(message, code);
}

/// Network exception
class NetworkException extends AppException {
  const NetworkException(String message, [String? code]) : super(message, code);
}

/// Cache exception
class CacheException extends AppException {
  const CacheException(String message, [String? code]) : super(message, code);
}

/// Authentication exception
class AuthException extends AppException {
  const AuthException(String message, [String? code]) : super(message, code);
}

/// Validation exception
class ValidationException extends AppException {
  const ValidationException(String message, [String? code]) : super(message, code);
}

/// Not found exception
class NotFoundException extends AppException {
  const NotFoundException(String message, [String? code]) : super(message, code);
}

/// Permission exception
class PermissionException extends AppException {
  const PermissionException(String message, [String? code]) : super(message, code);
}

/// Sync exception
class SyncException extends AppException {
  const SyncException(String message, [String? code]) : super(message, code);
}

/// Timeout exception
class TimeoutException extends AppException {
  const TimeoutException(String message, [String? code]) : super(message, code);
}

/// Offline exception
class OfflineException extends AppException {
  const OfflineException(String message, [String? code]) : super(message, code);
}
