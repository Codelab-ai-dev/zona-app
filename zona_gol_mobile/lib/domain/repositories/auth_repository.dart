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
  /// Returns [Right(void)] on success or [Left(Failure)] on error
  Future<Either<Failure, void>> logout();

  /// Get current authenticated user
  /// Returns [Right(UserEntity)] if authenticated or [Left(Failure)] if not
  Future<Either<Failure, UserEntity>> getCurrentUser();

  /// Check if user is authenticated
  /// Returns true if there's a valid session
  Future<bool> isAuthenticated();

  /// Stream of authentication state changes
  /// Emits user when logged in, null when logged out
  Stream<UserEntity?> get authStateChanges;

  /// Sign up with email and password (for future implementation)
  Future<Either<Failure, UserEntity>> signUpWithEmail({
    required String email,
    required String password,
    required String name,
  });

  /// Reset password (for future implementation)
  Future<Either<Failure, void>> resetPassword({
    required String email,
  });

  /// Update user profile (for future implementation)
  Future<Either<Failure, UserEntity>> updateProfile({
    required String userId,
    String? name,
    String? avatarUrl,
  });
}
