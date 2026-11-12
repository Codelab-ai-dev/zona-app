import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/failure_mapper.dart';
import '../../domain/entities/admin_user_entity.dart';
import '../../domain/repositories/user_admin_repository.dart';
import '../mappers/admin_user_mapper.dart';

/// User administration backed by `GET /users` and `/admin/users`.
class UserAdminRepositoryImpl implements UserAdminRepository {
  final ApiClient api;

  UserAdminRepositoryImpl({required this.api});

  @override
  Future<Either<Failure, List<AdminUserEntity>>> getUsers() async {
    try {
      final rows = await api.getAll('/users');
      return Right(rows.map(AdminUserMapper.fromJson).toList());
    } catch (e) {
      return Left(failureFrom(e, 'Error al cargar usuarios'));
    }
  }

  @override
  Future<Either<Failure, AdminUserEntity>> createUser({
    required String email,
    required String password,
    required String name,
    required String role,
    String? phone,
    String? leagueId,
    String? teamId,
  }) async {
    try {
      final created = await api.post('/admin/users', {
        'email': email,
        'password': password,
        'name': name,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        'role': role,
        if (leagueId != null) 'league_id': leagueId,
        if (teamId != null) 'team_id': teamId,
      });
      return Right(AdminUserMapper.fromJson((created as Map).cast<String, dynamic>()));
    } on ApiException catch (e) {
      if (e.isConflict) return const Left(ValidationFailure('Ya existe un usuario con ese email', 'conflict'));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  @override
  Future<Either<Failure, AdminUserEntity>> updateUser(
    String userId, {
    String? name,
    String? role,
    bool? isActive,
  }) async {
    try {
      final updated = await api.patch('/admin/users/$userId', {
        if (name != null) 'name': name,
        if (role != null) 'role': role,
        if (isActive != null) 'is_active': isActive,
      });
      return Right(AdminUserMapper.fromJson((updated as Map).cast<String, dynamic>()));
    } catch (e) {
      return Left(failureFrom(e));
    }
  }
}
