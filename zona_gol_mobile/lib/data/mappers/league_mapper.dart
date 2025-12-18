import '../../domain/entities/league_entity.dart';
import '../models/league_model.dart';

/// League Mapper
/// Maps between LeagueModel (data layer) and LeagueEntity (domain layer)
class LeagueMapper {
  /// Convert LeagueModel to LeagueEntity
  static LeagueEntity toEntity(LeagueModel model) {
    return LeagueEntity(
      id: model.id,
      name: model.name,
      slug: model.slug,
      description: model.description,
      logo: model.logo,
      adminId: model.adminId,
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    );
  }

  /// Convert LeagueEntity to LeagueModel
  static LeagueModel toModel(LeagueEntity entity) {
    return LeagueModel(
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      logo: entity.logo,
      adminId: entity.adminId,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }

  /// Convert a list of LeagueModels to LeagueEntities
  static List<LeagueEntity> toEntityList(List<LeagueModel> models) {
    return models.map((model) => toEntity(model)).toList();
  }

  /// Convert a list of LeagueEntities to LeagueModels
  static List<LeagueModel> toModelList(List<LeagueEntity> entities) {
    return entities.map((entity) => toModel(entity)).toList();
  }

  /// Create LeagueEntity from JSON (from Supabase)
  static LeagueEntity fromJson(Map<String, dynamic> json) {
    return toEntity(LeagueModel.fromJson(json));
  }

  /// Convert LeagueEntity to JSON (for Supabase)
  static Map<String, dynamic> toJson(LeagueEntity entity) {
    return toModel(entity).toJson();
  }
}
