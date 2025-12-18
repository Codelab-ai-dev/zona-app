import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/user_entity.dart';
import '../repositories/auth_repository.dart';

/// Get Current User Use Case
/// Retrieves the currently authenticated user
class GetCurrentUserUseCase {
  final AuthRepository repository;

  GetCurrentUserUseCase(this.repository);

  /// Execute the get current user use case
  ///
  /// Returns [Right(UserEntity)] if authenticated or [Left(Failure)] if not
  Future<Either<Failure, UserEntity>> call() async {
    return await repository.getCurrentUser();
  }
}
