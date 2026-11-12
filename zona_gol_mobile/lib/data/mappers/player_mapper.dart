import '../../core/network/json.dart';
import '../../domain/entities/player_entity.dart';
import '../../domain/entities/player_verification_entity.dart';

/// Player Mapper.
///
/// - `GET /teams/{id}/players` and `GET /players/{id}` return the public shape
///   (`id, name, team_id, position, jersey_number, photo, is_active`).
/// - `GET /leagues/{id}/players` adds `team_name` and `id_verified`.
/// - Create/update responses carry `birth_date` and `id_verified` too.
class PlayerMapper {
  static PlayerEntity fromJson(Map<String, dynamic> json) => PlayerEntity(
        id: json.str('id'),
        teamId: json.str('team_id'),
        name: json.str('name'),
        jerseyNumber: json.intOrNull('jersey_number'),
        photo: _nonEmpty(json.strOrNull('photo')),
        birthDate: json.dateOrNull('birth_date'),
        position: _nonEmpty(json.strOrNull('position')),
        isActive: json.boolean('is_active', true),
        idVerified: json.boolean('id_verified'),
        createdAt: json.dateOrNull('created_at'),
        updatedAt: json.dateOrNull('updated_at'),
      );

  /// Row of `GET /leagues/{id}/players/verification`.
  static PlayerVerificationEntity verificationFromJson(Map<String, dynamic> json) => PlayerVerificationEntity(
        playerId: json.str('player_id'),
        name: json.str('name'),
        jerseyNumber: json.integer('jersey_number'),
        position: json.str('position'),
        birthDate: json.dateOrNull('birth_date'),
        teamId: json.str('team_id'),
        teamName: json.str('team_name'),
        status: VerificationStatus.parse(json.strOrNull('status')),
        documentKey: _nonEmpty(json.strOrNull('document_key')),
        verifiedAt: json.dateOrNull('id_verified_at'),
      );

  /// `GET /leagues/{id}/players/verification/summary`.
  static VerificationSummaryEntity summaryFromJson(Map<String, dynamic> json) => VerificationSummaryEntity(
        total: json.integer('total'),
        pending: json.integer('pending'),
        verified: json.integer('verified'),
        noDocument: json.integer('no_document'),
      );

  static String? _nonEmpty(String? v) => v == null || v.isEmpty ? null : v;
}
