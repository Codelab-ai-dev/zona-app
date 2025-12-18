import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/user_entity.dart';
import '../repositories/auth_repository.dart';

/// Login with Email Use Case
/// Handles the business logic for email/password authentication
class LoginWithEmailUseCase {
  final AuthRepository repository;

  LoginWithEmailUseCase(this.repository);

  /// Execute the login use case
  ///
  /// [params] contains email and password
  /// Returns [Right(UserEntity)] on success or [Left(Failure)] on error
  Future<Either<Failure, UserEntity>> call(LoginParams params) async {
    // Validate email
    if (!_isValidEmail(params.email)) {
      return Left(ValidationFailure('Invalid email format'));
    }

    // Validate password
    if (params.password.isEmpty) {
      return Left(ValidationFailure('Password cannot be empty'));
    }

    if (params.password.length < 6) {
      return Left(ValidationFailure('Password must be at least 6 characters'));
    }

    // Call repository
    return await repository.loginWithEmail(
      email: params.email.trim(),
      password: params.password,
    );
  }

  /// Validate email format
  bool _isValidEmail(String email) {
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );
    return emailRegex.hasMatch(email);
  }
}

/// Parameters for Login Use Case
class LoginParams extends Equatable {
  final String email;
  final String password;

  const LoginParams({
    required this.email,
    required this.password,
  });

  @override
  List<Object?> get props => [email, password];
}
