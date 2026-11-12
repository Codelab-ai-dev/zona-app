import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/user_entity.dart';

/// Auth Repository Interface (Domain Layer)
/// Defines the contract for authentication operations
abstract class AuthRepository {
  /// Login with email and password
  /// Returns [Right(UserEntity)] on success or [Left(Failure)] on error
  Future<Either<Failure, UserEntity>> loginWithEmail({
    required String email,
    required String password,
  });

  /// Logout current user
  Future<Either<Failure, void>> logout();

  /// Get current authenticated user
  /// Returns [Right(UserEntity)] if authenticated or [Left(Failure)] if not
  Future<Either<Failure, UserEntity>> getCurrentUser();

  /// Check if there is a stored session
  Future<bool> isAuthenticated();

  /// Emits null when the session expires (refresh token rejected).
  Stream<UserEntity?> get authStateChanges;

  /// Sends a password reset email (always succeeds to avoid account probing).
  Future<Either<Failure, void>> resetPassword({
    required String email,
  });

  /// Change password for current user. The server then closes every session.
  Future<Either<Failure, void>> changePassword({
    required String currentPassword,
    required String newPassword,
  });
}
