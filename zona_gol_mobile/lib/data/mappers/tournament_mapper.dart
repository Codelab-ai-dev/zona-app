import '../../domain/entities/tournament_entity.dart';
import '../models/tournament_model.dart';

/// Tournament Mapper
/// Converts between TournamentModel (data layer) and TournamentEntity (domain layer)
class TournamentMapper {
  /// Convert TournamentModel to TournamentEntity
  static TournamentEntity toEntity(TournamentModel model) {
    return TournamentEntity(
      id: model.id,
      name: model.name,
      leagueId: model.leagueId,
      startDate: model.startDate,
      endDate: model.endDate,
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      maxPlayers: model.maxPlayers,
      maxCoachingStaff: model.maxCoachingStaff,
      format: model.tournamentFormat.toTournamentFormat(),
      numberOfGroups: model.numberOfGroups,
      teamsAdvancingPerGroup: model.teamsAdvancingPerGroup,
      roundsPerSeason: model.roundsPerSeason,
      hasThirdPlaceMatch: model.hasThirdPlaceMatch,
    );
  }

  /// Convert TournamentEntity to TournamentModel
  static TournamentModel toModel(TournamentEntity entity) {
    return TournamentModel(
      id: entity.id,
      name: entity.name,
      leagueId: entity.leagueId,
      startDate: entity.startDate,
      endDate: entity.endDate,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      maxPlayers: entity.maxPlayers,
      maxCoachingStaff: entity.maxCoachingStaff,
      tournamentFormat: entity.format.toDbString(),
      numberOfGroups: entity.numberOfGroups,
      teamsAdvancingPerGroup: entity.teamsAdvancingPerGroup,
      roundsPerSeason: entity.roundsPerSeason,
      hasThirdPlaceMatch: entity.hasThirdPlaceMatch,
    );
  }

  /// Convert list of TournamentModel to list of TournamentEntity
  static List<TournamentEntity> toEntityList(List<TournamentModel> models) {
    return models.map((model) => toEntity(model)).toList();
  }

  /// Convert list of TournamentEntity to list of TournamentModel
  static List<TournamentModel> toModelList(List<TournamentEntity> entities) {
    return entities.map((entity) => toModel(entity)).toList();
  }

  /// Create TournamentEntity from JSON
  static TournamentEntity fromJson(Map<String, dynamic> json) {
    final model = TournamentModel.fromJson(json);
    return toEntity(model);
  }

  /// Convert TournamentEntity to JSON
  static Map<String, dynamic> toJson(TournamentEntity entity) {
    final model = toModel(entity);
    return model.toJson();
  }
}
