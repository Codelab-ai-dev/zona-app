import '../../domain/entities/team_entity.dart';
import '../models/team_model.dart';

/// Team Mapper
/// Converts between TeamModel (data layer) and TeamEntity (domain layer)
class TeamMapper {
  /// Convert TeamModel to TeamEntity
  static TeamEntity toEntity(TeamModel model) {
    return TeamEntity(
      id: model.id,
      name: model.name,
      slug: model.slug,
      leagueId: model.leagueId,
      tournamentId: model.tournamentId,
      ownerId: model.ownerId,
      logo: model.logo,
      description: model.description,
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      homePrimaryColor: model.homePrimaryColor,
      homeSecondaryColor: model.homeSecondaryColor,
      homeAccentColor: model.homeAccentColor,
      awayPrimaryColor: model.awayPrimaryColor,
      awaySecondaryColor: model.awaySecondaryColor,
      awayAccentColor: model.awayAccentColor,
      groupName: model.groupName,
    );
  }

  /// Convert TeamEntity to TeamModel
  static TeamModel toModel(TeamEntity entity) {
    return TeamModel(
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      leagueId: entity.leagueId,
      tournamentId: entity.tournamentId,
      ownerId: entity.ownerId,
      logo: entity.logo,
      description: entity.description,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      homePrimaryColor: entity.homePrimaryColor,
      homeSecondaryColor: entity.homeSecondaryColor,
      homeAccentColor: entity.homeAccentColor,
      awayPrimaryColor: entity.awayPrimaryColor,
      awaySecondaryColor: entity.awaySecondaryColor,
      awayAccentColor: entity.awayAccentColor,
      groupName: entity.groupName,
    );
  }

  /// Convert list of TeamModel to list of TeamEntity
  static List<TeamEntity> toEntityList(List<TeamModel> models) {
    return models.map((model) => toEntity(model)).toList();
  }

  /// Convert list of TeamEntity to list of TeamModel
  static List<TeamModel> toModelList(List<TeamEntity> entities) {
    return entities.map((entity) => toModel(entity)).toList();
  }

  /// Create TeamEntity from JSON
  static TeamEntity fromJson(Map<String, dynamic> json) {
    print('🔍 TeamMapper.fromJson - Raw JSON: $json');
    print('🔍 Logo value: ${json['logo']}');
    final model = TeamModel.fromJson(json);
    print('🔍 Model logo: ${model.logo}');
    final entity = toEntity(model);
    print('🔍 Entity logo: ${entity.logo}');
    print('🔍 Has logo: ${entity.hasLogo}');
    return entity;
  }

  /// Convert TeamEntity to JSON
  static Map<String, dynamic> toJson(TeamEntity entity) {
    final model = toModel(entity);
    return model.toJson();
  }
}
