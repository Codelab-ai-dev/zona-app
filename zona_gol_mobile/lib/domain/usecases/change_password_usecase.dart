import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../repositories/auth_repository.dart';

class ChangePasswordParams extends Equatable {
  final String currentPassword;
  final String newPassword;

  const ChangePasswordParams({required this.currentPassword, required this.newPassword});

  @override
  List<Object?> get props => [currentPassword, newPassword];

  /// Validates password requirements
  static String? validate(String password) {
    if (password.length < 10) return 'Mínimo 10 caracteres';
    if (password.length > 72) return 'Máximo 72 caracteres';
    if (!password.contains(RegExp(r'[A-Z]'))) return 'Debe contener una mayúscula';
    if (!password.contains(RegExp(r'[a-z]'))) return 'Debe contener una minúscula';
    if (!password.contains(RegExp(r'[0-9]'))) return 'Debe contener un número';
    if (!password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) return 'Debe contener un carácter especial';
    return null;
  }
}

class ChangePasswordUseCase {
  final AuthRepository repository;

  ChangePasswordUseCase(this.repository);

  Future<Either<Failure, void>> call(ChangePasswordParams params) {
    return repository.changePassword(
      currentPassword: params.currentPassword,
      newPassword: params.newPassword,
    );
  }
}
