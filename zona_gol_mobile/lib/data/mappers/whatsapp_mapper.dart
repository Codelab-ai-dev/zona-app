import '../../core/network/json.dart';
import '../../domain/entities/whatsapp_link_entity.dart';

/// Maps the WhatsApp link API shape (backend/internal/directory WhatsAppLink).
class WhatsAppMapper {
  static WhatsAppLinkEntity fromJson(Map<String, dynamic> json) {
    return WhatsAppLinkEntity(
      id: json.str('id'),
      phoneNumber: json.str('phone_number'),
      userId: json.strOrNull('user_id'),
      leagueId: json.strOrNull('league_id'),
      tournamentId: json.strOrNull('tournament_id'),
      role: json.strOrNull('role'),
      isActive: json.boolean('is_active', true),
      linkedAt: json.dateOrNull('linked_at'),
      lastInteractionAt: json.dateOrNull('last_interaction_at'),
      displayName: json.strOrNull('display_name'),
      preferredLanguage: json.str('preferred_language', 'es'),
      createdAt: json.dateOrNull('created_at'),
      updatedAt: json.dateOrNull('updated_at'),
    );
  }
}
