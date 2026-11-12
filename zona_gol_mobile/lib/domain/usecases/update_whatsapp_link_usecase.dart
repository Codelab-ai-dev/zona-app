import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/whatsapp_link_entity.dart';
import '../repositories/whatsapp_repository.dart';

class UpdateWhatsAppLinkUseCase {
  final WhatsAppRepository repository;

  UpdateWhatsAppLinkUseCase(this.repository);

  Future<Either<Failure, WhatsAppLinkEntity>> call(
    UpdateWhatsAppLinkParams params,
  ) async {
    if (params.id.isEmpty) {
      return Left(ValidationFailure('ID del enlace es requerido'));
    }

    if (params.phoneNumber != null &&
        !WhatsAppLinkEntity.isValidPhoneNumber(params.phoneNumber!)) {
      return Left(
        ValidationFailure(
          'Formato de teléfono inválido. Usa de 10 a 15 dígitos con lada de país, p. ej. 525512345678',
        ),
      );
    }

    return await repository.updateLink(
      id: params.id,
      phoneNumber: params.phoneNumber == null
          ? null
          : WhatsAppLinkEntity.normalizePhone(params.phoneNumber!),
      displayName: params.displayName?.trim(),
      preferredLanguage: params.preferredLanguage,
    );
  }
}

class UpdateWhatsAppLinkParams {
  final String id;
  final String? phoneNumber;
  final String? displayName;
  final String? preferredLanguage;

  const UpdateWhatsAppLinkParams({
    required this.id,
    this.phoneNumber,
    this.displayName,
    this.preferredLanguage,
  });
}
