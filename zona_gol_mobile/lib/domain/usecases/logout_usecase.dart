import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../repositories/auth_repository.dart';

/// Logout Use Case
/// Handles the business logic for logging out the current user
class LogoutUseCase {
  final AuthRepository repository;

  LogoutUseCase(this.repository);

  /// Execute the logout use case
  ///
  /// Returns [Right(void)] on success or [Left(Failure)] on error
  Future<Either<Failure, void>> call() async {
    return await repository.logout();
  }
}
