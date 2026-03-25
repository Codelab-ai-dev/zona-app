import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../repositories/whatsapp_repository.dart';

class DeleteWhatsAppLinkUseCase {
  final WhatsAppRepository repository;

  DeleteWhatsAppLinkUseCase(this.repository);

  Future<Either<Failure, void>> call(
    DeleteWhatsAppLinkParams params,
  ) async {
    if (params.id.isEmpty) {
      return Left(ValidationFailure('ID del enlace es requerido'));
    }

    return await repository.deleteLink(params.id);
  }
}

class DeleteWhatsAppLinkParams {
  final String id;

  const DeleteWhatsAppLinkParams({required this.id});
}
