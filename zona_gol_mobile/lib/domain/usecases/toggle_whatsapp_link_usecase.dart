import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/whatsapp_link_entity.dart';
import '../repositories/whatsapp_repository.dart';

class ToggleWhatsAppLinkUseCase {
  final WhatsAppRepository repository;

  ToggleWhatsAppLinkUseCase(this.repository);

  Future<Either<Failure, WhatsAppLinkEntity>> call(
    ToggleWhatsAppLinkParams params,
  ) async {
    if (params.id.isEmpty) {
      return Left(ValidationFailure('ID del enlace es requerido'));
    }

    return await repository.toggleActive(
      id: params.id,
      isActive: params.isActive,
    );
  }
}

class ToggleWhatsAppLinkParams {
  final String id;
  final bool isActive;

  const ToggleWhatsAppLinkParams({
    required this.id,
    required this.isActive,
  });
}
