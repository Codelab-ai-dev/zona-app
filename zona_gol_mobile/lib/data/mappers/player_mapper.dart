import '../../domain/entities/player_entity.dart';
import '../models/player_model.dart';

/// Player Mapper
/// Converts between PlayerModel (data layer) and PlayerEntity (domain layer)
class PlayerMapper {
  /// Convert PlayerModel to PlayerEntity
  static PlayerEntity toEntity(PlayerModel model) {
    return PlayerEntity(
      id: model.id,
      teamId: model.teamId,
      name: model.name,
      jerseyNumber: model.jerseyNumber,
      photo: model.photo,
      birthDate: model.birthDate,
      position: model.position,
      isActive: model.isActive,
      idDocumentUrl: model.idDocumentUrl,
      idVerified: model.idVerified,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    );
  }

  /// Convert PlayerEntity to PlayerModel
  static PlayerModel toModel(PlayerEntity entity) {
    return PlayerModel(
      id: entity.id,
      teamId: entity.teamId,
      name: entity.name,
      jerseyNumber: entity.jerseyNumber,
      photo: entity.photo,
      birthDate: entity.birthDate,
      position: entity.position,
      isActive: entity.isActive,
      idDocumentUrl: entity.idDocumentUrl,
      idVerified: entity.idVerified,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }

  /// Convert list of PlayerModel to list of PlayerEntity
  static List<PlayerEntity> toEntityList(List<PlayerModel> models) {
    return models.map((model) => toEntity(model)).toList();
  }

  /// Create PlayerEntity from JSON
  static PlayerEntity fromJson(Map<String, dynamic> json) {
    final model = PlayerModel.fromJson(json);
    return toEntity(model);
  }

  /// Convert PlayerEntity to JSON
  static Map<String, dynamic> toJson(PlayerEntity entity) {
    final model = toModel(entity);
    return model.toJson();
  }
}
