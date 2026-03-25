import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/whatsapp_link_entity.dart';
import '../repositories/whatsapp_repository.dart';

class GetWhatsAppLinksUseCase {
  final WhatsAppRepository repository;

  GetWhatsAppLinksUseCase(this.repository);

  Future<Either<Failure, List<WhatsAppLinkEntity>>> call(
    GetWhatsAppLinksParams params,
  ) async {
    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('ID de la liga es requerido'));
    }

    return await repository.getLinks(params.leagueId);
  }
}

class GetWhatsAppLinksParams {
  final String leagueId;

  const GetWhatsAppLinksParams({required this.leagueId});
}
