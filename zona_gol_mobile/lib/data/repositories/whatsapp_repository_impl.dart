import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/failure_mapper.dart';
import '../../domain/entities/whatsapp_link_entity.dart';
import '../../domain/repositories/whatsapp_repository.dart';
import '../mappers/whatsapp_mapper.dart';

/// WhatsApp link repository backed by the Zona Gol API
/// (`/leagues/{id}/whatsapp-links`, `/whatsapp-links/{id}`).
class WhatsAppRepositoryImpl implements WhatsAppRepository {
  final ApiClient api;

  WhatsAppRepositoryImpl({required this.api});

  static const _duplicate = 'Este número de teléfono ya está vinculado';

  @override
  Future<Either<Failure, List<WhatsAppLinkEntity>>> getLinks(
    String leagueId,
  ) async {
    try {
      final rows = await api.getAll('/leagues/$leagueId/whatsapp-links');
      return Right(rows.map(WhatsAppMapper.fromJson).toList());
    } catch (e) {
      return Left(failureFrom(e, 'Error al obtener enlaces de WhatsApp'));
    }
  }

  @override
  Future<Either<Failure, WhatsAppLinkEntity>> createLink({
    required String phoneNumber,
    String? userId,
    required String role,
    String? displayName,
    required String leagueId,
    String? preferredLanguage,
  }) async {
    try {
      final json = await api.post('/leagues/$leagueId/whatsapp-links', {
        'phone_number': WhatsAppLinkEntity.normalizePhone(phoneNumber),
        'role': role,
        'preferred_language': preferredLanguage ?? 'es',
        if (userId != null) 'user_id': userId,
        if (displayName != null && displayName.isNotEmpty)
          'display_name': displayName,
      });
      return Right(WhatsAppMapper.fromJson(_obj(json)));
    } on ApiException catch (e) {
      if (e.isConflict) return Left(ServerFailure(_duplicate, e.code));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'Error al crear enlace de WhatsApp'));
    }
  }

  @override
  Future<Either<Failure, WhatsAppLinkEntity>> updateLink({
    required String id,
    String? phoneNumber,
    String? displayName,
    String? preferredLanguage,
  }) async {
    try {
      final json = await api.put('/whatsapp-links/$id', {
        if (phoneNumber != null)
          'phone_number': WhatsAppLinkEntity.normalizePhone(phoneNumber),
        if (displayName != null) 'display_name': displayName,
        if (preferredLanguage != null) 'preferred_language': preferredLanguage,
      });
      return Right(WhatsAppMapper.fromJson(_obj(json)));
    } on ApiException catch (e) {
      if (e.isConflict) return Left(ServerFailure(_duplicate, e.code));
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'Error al actualizar enlace de WhatsApp'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteLink(String id) async {
    try {
      // DELETE deactivates the link and returns it.
      await api.delete('/whatsapp-links/$id');
      return const Right(null);
    } catch (e) {
      return Left(failureFrom(e, 'Error al desactivar enlace de WhatsApp'));
    }
  }

  @override
  Future<Either<Failure, WhatsAppLinkEntity>> toggleActive({
    required String id,
    required bool isActive,
  }) async {
    try {
      final json = await api.put('/whatsapp-links/$id', {
        'is_active': isActive,
      });
      return Right(WhatsAppMapper.fromJson(_obj(json)));
    } catch (e) {
      return Left(failureFrom(e, 'Error al cambiar estado del enlace'));
    }
  }

  static Map<String, dynamic> _obj(dynamic body) =>
      (body as Map).cast<String, dynamic>();
}
