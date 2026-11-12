import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/whatsapp_link_entity.dart';
import '../repositories/whatsapp_repository.dart';

class CreateWhatsAppLinkUseCase {
  final WhatsAppRepository repository;

  CreateWhatsAppLinkUseCase(this.repository);

  Future<Either<Failure, WhatsAppLinkEntity>> call(
    CreateWhatsAppLinkParams params,
  ) async {
    if (params.phoneNumber.trim().isEmpty) {
      return Left(ValidationFailure('El número de teléfono es requerido'));
    }

    if (!WhatsAppLinkEntity.isValidPhoneNumber(params.phoneNumber)) {
      return Left(
        ValidationFailure(
          'Formato de teléfono inválido. Usa de 10 a 15 dígitos con lada de país, p. ej. 525512345678',
        ),
      );
    }

    if (!WhatsAppLinkEntity.roles.contains(params.role)) {
      return const Left(ValidationFailure('Selecciona un rol válido'));
    }

    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('ID de la liga es requerido'));
    }

    return await repository.createLink(
      phoneNumber: WhatsAppLinkEntity.normalizePhone(params.phoneNumber),
      userId: params.userId,
      role: params.role,
      displayName: params.displayName?.trim(),
      leagueId: params.leagueId,
      preferredLanguage: params.preferredLanguage,
    );
  }
}

class CreateWhatsAppLinkParams {
  final String phoneNumber;
  final String? userId;
  final String role;
  final String? displayName;
  final String leagueId;
  final String? preferredLanguage;

  const CreateWhatsAppLinkParams({
    required this.phoneNumber,
    this.userId,
    required this.role,
    this.displayName,
    required this.leagueId,
    this.preferredLanguage,
  });
}
