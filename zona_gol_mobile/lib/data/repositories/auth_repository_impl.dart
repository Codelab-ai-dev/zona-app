import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/failure_mapper.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/local/hive_service.dart';
import '../mappers/user_mapper.dart';

/// Auth repository backed by the Zona Gol API (`/auth/*`, `/me`).
/// The profile is cached so the app can start offline with a stored session.
class AuthRepositoryImpl implements AuthRepository {
  final ApiClient api;
  final HiveService hiveService;

  AuthRepositoryImpl({required this.api, required this.hiveService});

  @override
  Future<Either<Failure, UserEntity>> loginWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      await api.login(email.trim(), password);
      final user = UserMapper.fromJson(await api.getObject('/me'));
      await _cache(user);
      return Right(user);
    } on ApiException catch (e) {
      if (e.isUnauthorized) return const Left(AuthFailure('Email o contraseña incorrectos', 'invalid_credentials'));
      if (e.status == 429) return Left(AuthFailure('Demasiados intentos. Espera un minuto e inténtalo de nuevo.', e.code));
      if (e.isForbidden) return Left(AuthFailure('Tu cuenta está desactivada', e.code));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    await api.logout();
    await _clearCache();
    return const Right(null);
  }

  @override
  Future<Either<Failure, UserEntity>> getCurrentUser() async {
    if (!await api.hasSession) return const Left(AuthFailure('No hay sesión activa'));
    try {
      final user = UserMapper.fromJson(await api.getObject('/me'));
      await _cache(user);
      return Right(user);
    } on ApiException catch (e) {
      if (e.isNetwork) {
        final cached = _cachedUser();
        if (cached != null) return Right(cached);
      }
      if (e.isUnauthorized || e.isForbidden) {
        await api.clearSession();
        await _clearCache();
      }
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  @override
  Future<bool> isAuthenticated() => api.hasSession;

  @override
  Stream<UserEntity?> get authStateChanges => api.sessionExpired.asyncMap((_) async {
        await _clearCache();
        return null;
      });

  @override
  Future<Either<Failure, void>> resetPassword({required String email}) async {
    try {
      await api.post('/auth/password/forgot', {'email': email.trim()});
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  @override
  Future<Either<Failure, void>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await api.post('/auth/password/change', {
        'current_password': currentPassword,
        'new_password': newPassword,
      });
      return const Right(null);
    } on ApiException catch (e) {
      if (e.isUnauthorized || e.code == 'invalid_credentials') {
        return const Left(AuthFailure('La contraseña actual no es correcta'));
      }
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e));
    }
  }

  Future<void> _cache(UserEntity user) async {
    try {
      await hiveService.saveUserProfile(UserMapper.toMap(user));
    } catch (_) {
      // The cache is an offline convenience only.
    }
  }

  UserEntity? _cachedUser() {
    try {
      final cached = hiveService.getUserProfile();
      return cached == null ? null : UserMapper.fromMap(cached);
    } catch (_) {
      return null;
    }
  }

  Future<void> _clearCache() async {
    try {
      await hiveService.clearBox('user_profile');
    } catch (_) {
      // Box not opened yet: nothing cached.
    }
  }
}
