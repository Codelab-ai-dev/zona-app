import '../../domain/entities/whatsapp_link_entity.dart';
import '../models/whatsapp_link_model.dart';

/// WhatsApp Mapper
/// Converts between WhatsAppLinkModel (data layer) and WhatsAppLinkEntity (domain layer)
class WhatsAppMapper {
  /// Convert WhatsAppLinkModel to WhatsAppLinkEntity
  static WhatsAppLinkEntity toEntity(WhatsAppLinkModel model) {
    return WhatsAppLinkEntity(
      id: model.id,
      phoneNumber: model.phoneNumber,
      userId: model.userId,
      role: model.role,
      isActive: model.isActive,
      displayName: model.displayName,
      preferredLanguage: model.preferredLanguage,
      lastInteractionAt: model.lastInteractionAt,
      leagueId: model.leagueId,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    );
  }

  /// Convert WhatsAppLinkEntity to WhatsAppLinkModel
  static WhatsAppLinkModel toModel(WhatsAppLinkEntity entity) {
    return WhatsAppLinkModel(
      id: entity.id,
      phoneNumber: entity.phoneNumber,
      userId: entity.userId,
      role: entity.role,
      isActive: entity.isActive,
      displayName: entity.displayName,
      preferredLanguage: entity.preferredLanguage,
      lastInteractionAt: entity.lastInteractionAt,
      leagueId: entity.leagueId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }

  /// Convert list of WhatsAppLinkModel to list of WhatsAppLinkEntity
  static List<WhatsAppLinkEntity> toEntityList(List<WhatsAppLinkModel> models) {
    return models.map((model) => toEntity(model)).toList();
  }

  /// Create WhatsAppLinkEntity from JSON (database row)
  static WhatsAppLinkEntity fromJson(Map<String, dynamic> json) {
    final model = WhatsAppLinkModel.fromJson(json);
    return toEntity(model);
  }

  /// Convert WhatsAppLinkEntity to JSON
  static Map<String, dynamic> toJson(WhatsAppLinkEntity entity) {
    final model = toModel(entity);
    return model.toJson();
  }
}
