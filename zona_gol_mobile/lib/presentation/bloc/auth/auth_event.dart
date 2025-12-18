import 'package:equatable/equatable.dart';

/// Auth Events
/// Represents all possible authentication events
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// Login with email and password
class LoginWithEmailEvent extends AuthEvent {
  final String email;
  final String password;

  const LoginWithEmailEvent({
    required this.email,
    required this.password,
  });

  @override
  List<Object?> get props => [email, password];
}

/// Logout event
class LogoutEvent extends AuthEvent {
  const LogoutEvent();
}

/// Check authentication status
class CheckAuthEvent extends AuthEvent {
  const CheckAuthEvent();
}

/// Auth state changed (from listener)
class AuthStateChangedEvent extends AuthEvent {
  final bool isAuthenticated;

  const AuthStateChangedEvent(this.isAuthenticated);

  @override
  List<Object?> get props => [isAuthenticated];
}
