import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/whatsapp_link_entity.dart';

/// WhatsApp Repository
/// Defines the contract for WhatsApp link data operations
abstract class WhatsAppRepository {
  /// Get all WhatsApp links for a league
  Future<Either<Failure, List<WhatsAppLinkEntity>>> getLinks(String leagueId);

  /// Create a new WhatsApp link
  Future<Either<Failure, WhatsAppLinkEntity>> createLink({
    required String phoneNumber,
    String? userId,
    String? role,
    String? displayName,
    required String leagueId,
    String? preferredLanguage,
  });

  /// Update an existing WhatsApp link
  Future<Either<Failure, WhatsAppLinkEntity>> updateLink({
    required String id,
    String? phoneNumber,
    String? role,
    String? displayName,
    String? preferredLanguage,
  });

  /// Delete a WhatsApp link
  Future<Either<Failure, void>> deleteLink(String id);

  /// Toggle active status of a WhatsApp link
  Future<Either<Failure, WhatsAppLinkEntity>> toggleActive({
    required String id,
    required bool isActive,
  });
}
