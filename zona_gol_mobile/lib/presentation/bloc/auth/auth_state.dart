import 'package:equatable/equatable.dart';
import '../../../domain/entities/user_entity.dart';

/// Auth States
/// Represents all possible authentication states
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/// Initial state
class AuthInitial extends AuthState {
  const AuthInitial();
}

/// Loading state (during authentication operations)
class AuthLoading extends AuthState {
  const AuthLoading();
}

/// Authenticated state (user is logged in)
class Authenticated extends AuthState {
  final UserEntity user;

  const Authenticated(this.user);

  @override
  List<Object?> get props => [user];
}

/// Unauthenticated state (no user logged in)
class Unauthenticated extends AuthState {
  const Unauthenticated();
}

/// Authentication error state
class AuthError extends AuthState {
  final String message;

  const AuthError(this.message);

  @override
  List<Object?> get props => [message];
}
