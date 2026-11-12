import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/admin_user_entity.dart';

/// User accounts as the super admin manages them.
abstract class UserAdminRepository {
  /// Every user, newest first, with league and team names.
  Future<Either<Failure, List<AdminUserEntity>>> getUsers();

  /// Create an account. [password] must be 10..72 characters.
  Future<Either<Failure, AdminUserEntity>> createUser({
    required String email,
    required String password,
    required String name,
    required String role,
    String? phone,
    String? leagueId,
    String? teamId,
  });

  /// Update name, role or active flag of an account.
  Future<Either<Failure, AdminUserEntity>> updateUser(
    String userId, {
    String? name,
    String? role,
    bool? isActive,
  });
}
