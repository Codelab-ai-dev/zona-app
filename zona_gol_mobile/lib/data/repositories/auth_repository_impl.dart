import 'dart:async';
import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/errors/exceptions.dart' as core;
import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/local/hive_service.dart';
import '../datasources/local/secure_storage_service.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/user_mapper.dart';

/// Auth Repository Implementation
/// Implements authentication logic using Supabase
class AuthRepositoryImpl implements AuthRepository {
  final SupabaseClientService supabaseService;
  final SecureStorageService secureStorage;
  final HiveService hiveService;
  final NetworkInfo networkInfo;

  // Stream controller for auth state changes
  final _authStateController = StreamController<UserEntity?>.broadcast();

  AuthRepositoryImpl({
    required this.supabaseService,
    required this.secureStorage,
    required this.hiveService,
    required this.networkInfo,
  }) {
    _initAuthListener();
  }

  /// Initialize auth state listener
  void _initAuthListener() {
    supabaseService.client.auth.onAuthStateChange.listen((data) async {
      final session = data.session;
      if (session != null && session.user != null) {
        try {
          final user = await UserMapper.fromSupabaseUser(
            session.user,
            supabaseService.client,
          );

          // Cache user data
          await _cacheUserData(user, session);

          _authStateController.add(user);
        } catch (e) {
          _authStateController.add(null);
        }
      } else {
        // Clear cache on logout
        await _clearCache();
        _authStateController.add(null);
      }
    });
  }

  @override
  Future<Either<Failure, UserEntity>> loginWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      print('🔐 Attempting login for: $email');

      // Check network connectivity
      final isConnected = await networkInfo.isConnected;
      print('📡 Network connected: $isConnected');
      if (!isConnected) {
        print('❌ No internet connection');
        return Left(NetworkFailure('No internet connection'));
      }

      // Attempt login
      print('🔄 Calling Supabase signInWithPassword...');
      final response = await supabaseService.client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      print('✅ Supabase response received');
      print('   User: ${response.user?.id}');
      print('   Session: ${response.session != null}');

      if (response.user == null || response.session == null) {
        print('❌ No user data received');
        return Left(AuthFailure('Login failed: No user data received'));
      }

      // Convert to UserEntity
      print('🔄 Converting to UserEntity...');
      final user = await UserMapper.fromSupabaseUser(
        response.user!,
        supabaseService.client,
      );

      print('✅ User converted: ${user.email}, role: ${user.role}');

      // Cache user data and session
      print('💾 Caching user data...');
      await _cacheUserData(user, response.session!);

      print('✅ Login successful!');
      return Right(user);
    } on AuthException catch (e) {
      // Supabase auth errors
      print('❌ AuthException: ${e.message}');
      print('   Status Code: ${e.statusCode}');
      return Left(AuthFailure(_mapAuthException(e)));
    } on core.ServerException catch (e) {
      print('❌ ServerException: ${e.message}');
      return Left(ServerFailure(e.message));
    } catch (e, stackTrace) {
      print('❌ Unexpected error during login: $e');
      print('   Stack trace: $stackTrace');
      return Left(AuthFailure('Login failed: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      // Sign out from Supabase
      await supabaseService.client.auth.signOut();

      // Clear all cached data
      await _clearCache();

      return const Right(null);
    } on AuthException catch (e) {
      return Left(AuthFailure(_mapAuthException(e)));
    } catch (e) {
      return Left(AuthFailure('Logout failed: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, UserEntity>> getCurrentUser() async {
    try {
      final currentUser = supabaseService.client.auth.currentUser;

      if (currentUser == null) {
        // Try to get from cache
        final cachedUser = await _getCachedUser();
        if (cachedUser != null) {
          return Right(cachedUser);
        }
        return Left(AuthFailure('No user logged in'));
      }

      // Convert to UserEntity
      final user = await UserMapper.fromSupabaseUser(
        currentUser,
        supabaseService.client,
      );

      return Right(user);
    } catch (e) {
      // Try to get from cache as fallback
      final cachedUser = await _getCachedUser();
      if (cachedUser != null) {
        return Right(cachedUser);
      }
      return Left(AuthFailure('Failed to get current user: ${e.toString()}'));
    }
  }

  @override
  Future<bool> isAuthenticated() async {
    try {
      final session = supabaseService.client.auth.currentSession;
      if (session != null) {
        return true;
      }

      // Check secure storage for valid session
      return await secureStorage.hasValidSession();
    } catch (e) {
      return false;
    }
  }

  @override
  Stream<UserEntity?> get authStateChanges => _authStateController.stream;

  @override
  Future<Either<Failure, UserEntity>> signUpWithEmail({
    required String email,
    required String password,
    required String name,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client.auth.signUp(
        email: email,
        password: password,
        data: {'name': name},
      );

      if (response.user == null) {
        return Left(AuthFailure('Sign up failed: No user data received'));
      }

      // Create user profile in users table
      await supabaseService.client.from('users').insert({
        'id': response.user!.id,
        'email': email,
        'name': name,
        'user_role': 'public', // Default role
        'created_at': DateTime.now().toIso8601String(),
      });

      final user = await UserMapper.fromSupabaseUser(
        response.user!,
        supabaseService.client,
      );

      if (response.session != null) {
        await _cacheUserData(user, response.session!);
      }

      return Right(user);
    } on AuthException catch (e) {
      return Left(AuthFailure(_mapAuthException(e)));
    } catch (e) {
      return Left(AuthFailure('Sign up failed: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> resetPassword({
    required String email,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      await supabaseService.client.auth.resetPasswordForEmail(email);
      return const Right(null);
    } on AuthException catch (e) {
      return Left(AuthFailure(_mapAuthException(e)));
    } catch (e) {
      return Left(AuthFailure('Password reset failed: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, UserEntity>> updateProfile({
    required String userId,
    String? name,
    String? avatarUrl,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      // Update in users table
      final updates = <String, dynamic>{};
      if (name != null) updates['name'] = name;
      if (avatarUrl != null) updates['avatar_url'] = avatarUrl;

      await supabaseService.client
          .from('users')
          .update(updates)
          .eq('id', userId);

      // Get updated user
      return await getCurrentUser();
    } catch (e) {
      return Left(ServerFailure('Profile update failed: ${e.toString()}'));
    }
  }

  // Helper methods

  /// Cache user data and session
  Future<void> _cacheUserData(UserEntity user, Session session) async {
    try {
      // Save to secure storage
      await secureStorage.saveAuthSession(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken ?? '',
        userId: user.id,
        email: user.email,
        role: user.role,
        expiresAt: DateTime.fromMillisecondsSinceEpoch(
          session.expiresAt! * 1000,
        ),
      );

      // Save user profile to Hive
      await hiveService.saveUserProfile(UserMapper.toMap(user));
    } catch (e) {
      print('⚠️ Failed to cache user data: $e');
    }
  }

  /// Get cached user from Hive
  Future<UserEntity?> _getCachedUser() async {
    try {
      final cached = hiveService.getUserProfile();
      if (cached != null) {
        return UserMapper.fromMap(cached);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Clear all cached data
  Future<void> _clearCache() async {
    try {
      await secureStorage.deleteAll();
    } catch (e) {
      print('⚠️ Failed to clear secure storage: $e');
    }

    try {
      await hiveService.clearBox('user_profile');
    } catch (e) {
      // Ignore if box doesn't exist - cache is already clear
      // This is normal on first logout before any user data is cached
    }
  }

  /// Map Supabase AuthException to user-friendly message
  String _mapAuthException(AuthException e) {
    final message = e.message.toLowerCase();

    if (message.contains('invalid') && message.contains('credentials')) {
      return 'Email o contraseña incorrectos';
    } else if (message.contains('email') && message.contains('not confirmed')) {
      return 'Por favor verifica tu correo electrónico';
    } else if (message.contains('user') && message.contains('not found')) {
      return 'Usuario no encontrado';
    } else if (message.contains('weak password')) {
      return 'La contraseña es muy débil';
    } else if (message.contains('email') && message.contains('already')) {
      return 'Este correo ya está registrado';
    } else {
      return e.message;
    }
  }

  /// Dispose resources
  void dispose() {
    _authStateController.close();
  }
}
