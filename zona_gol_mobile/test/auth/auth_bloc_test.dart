import 'dart:async';

import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zona_gol_mobile/core/errors/failures.dart';
import 'package:zona_gol_mobile/domain/entities/user_entity.dart';
import 'package:zona_gol_mobile/domain/repositories/auth_repository.dart';
import 'package:zona_gol_mobile/domain/usecases/get_current_user_usecase.dart';
import 'package:zona_gol_mobile/domain/usecases/login_with_email_usecase.dart';
import 'package:zona_gol_mobile/domain/usecases/logout_usecase.dart';
import 'package:zona_gol_mobile/presentation/bloc/auth/auth_bloc.dart';
import 'package:zona_gol_mobile/presentation/bloc/auth/auth_state.dart';

const _user = UserEntity(id: 'u1', email: 'liga@zonagol.local', role: 'league_admin');

class _FakeAuthRepository implements AuthRepository {
  _FakeAuthRepository({required this.signedIn});

  bool signedIn;
  final expired = StreamController<UserEntity?>.broadcast();

  @override
  Future<Either<Failure, UserEntity>> getCurrentUser() async =>
      signedIn ? const Right(_user) : const Left(AuthFailure('Sin sesión'));

  @override
  Stream<UserEntity?> get authStateChanges => expired.stream;

  @override
  Future<Either<Failure, UserEntity>> loginWithEmail({required String email, required String password}) async =>
      const Right(_user);

  @override
  Future<Either<Failure, void>> logout() async => const Right(null);

  @override
  Future<bool> isAuthenticated() async => signedIn;

  @override
  Future<Either<Failure, void>> resetPassword({required String email}) async => const Right(null);

  @override
  Future<Either<Failure, void>> changePassword({required String currentPassword, required String newPassword}) async =>
      const Right(null);
}

AuthBloc _bloc(_FakeAuthRepository repo) => AuthBloc(
      loginWithEmailUseCase: LoginWithEmailUseCase(repo),
      logoutUseCase: LogoutUseCase(repo),
      getCurrentUserUseCase: GetCurrentUserUseCase(repo),
      authStateChanges: repo.authStateChanges,
    );

void main() {
  test('an expired session sends a signed-in user back to login with a notice', () async {
    final repo = _FakeAuthRepository(signedIn: true);
    final bloc = _bloc(repo);
    await expectLater(bloc.stream, emitsThrough(isA<Authenticated>()));

    repo.expired.add(null);

    await expectLater(
      bloc.stream,
      emits(isA<Unauthenticated>().having((s) => s.message, 'message', 'Tu sesión expiró. Inicia sesión de nuevo.')),
    );
    await bloc.close();
  });

  test('an expiry while signed out changes nothing', () async {
    final repo = _FakeAuthRepository(signedIn: false);
    final bloc = _bloc(repo);
    await expectLater(bloc.stream, emitsThrough(isA<Unauthenticated>()));

    repo.expired.add(null);
    await Future<void>.delayed(const Duration(milliseconds: 20));

    expect(bloc.state, isA<Unauthenticated>().having((s) => s.message, 'message', isNull));
    await bloc.close();
  });
}
