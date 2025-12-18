import 'package:equatable/equatable.dart';

/// Base failure class
abstract class Failure extends Equatable {
  final String message;
  final String? code;

  const Failure(this.message, [this.code]);

  @override
  List<Object?> get props => [message, code];

  @override
  String toString() => 'Failure: $message${code != null ? " (code: $code)" : ""}';
}

/// Server failure
class ServerFailure extends Failure {
  const ServerFailure(String message, [String? code]) : super(message, code);
}

/// Network failure
class NetworkFailure extends Failure {
  const NetworkFailure(String message, [String? code]) : super(message, code);
}

/// Cache failure
class CacheFailure extends Failure {
  const CacheFailure(String message, [String? code]) : super(message, code);
}

/// Authentication failure
class AuthFailure extends Failure {
  const AuthFailure(String message, [String? code]) : super(message, code);
}

/// Validation failure
class ValidationFailure extends Failure {
  const ValidationFailure(String message, [String? code]) : super(message, code);
}

/// Not found failure
class NotFoundFailure extends Failure {
  const NotFoundFailure(String message, [String? code]) : super(message, code);
}

/// Permission failure
class PermissionFailure extends Failure {
  const PermissionFailure(String message, [String? code]) : super(message, code);
}

/// Sync failure
class SyncFailure extends Failure {
  const SyncFailure(String message, [String? code]) : super(message, code);
}

/// Timeout failure
class TimeoutFailure extends Failure {
  const TimeoutFailure(String message, [String? code]) : super(message, code);
}

/// Offline failure
class OfflineFailure extends Failure {
  const OfflineFailure(String message, [String? code]) : super(message, code);
}
