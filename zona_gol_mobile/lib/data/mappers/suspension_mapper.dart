import '../../domain/entities/suspension_entity.dart';
import '../models/suspension_model.dart';

/// Maps between SuspensionModel and SuspensionEntity
class SuspensionMapper {
  /// Convert a DB row (with joined player/team data) to SuspensionEntity
  static SuspensionEntity fromRow(Map<String, dynamic> row) {
    final player = row['players'] as Map<String, dynamic>?;
    final team = player?['teams'] as Map<String, dynamic>?;

    return SuspensionEntity(
      id: row['id'] as String,
      playerId: row['player_id'] as String,
      teamId: row['team_id'] as String? ?? '',
      leagueId: row['league_id'] as String? ?? '',
      tournamentId: row['tournament_id'] as String?,
      suspensionType:
          SuspensionType.fromString(row['suspension_type'] as String? ?? 'other'),
      reason: row['reason'] as String?,
      matchesToServe: (row['matches_to_serve'] as num?)?.toInt() ?? 1,
      matchesServed: (row['matches_served'] as num?)?.toInt() ?? 0,
      status: SuspensionStatus.fromString(row['status'] as String? ?? 'active'),
      notes: row['notes'] as String?,
      createdAt: row['created_at'] != null
          ? DateTime.tryParse(row['created_at'] as String)
          : null,
      updatedAt: row['updated_at'] != null
          ? DateTime.tryParse(row['updated_at'] as String)
          : null,
      playerName: player?['name'] as String?,
      jerseyNumber: player?['jersey_number'] as int?,
      teamName: team?['name'] as String?,
    );
  }

  /// Convert SuspensionModel to SuspensionEntity (without joined data)
  static SuspensionEntity toEntity(SuspensionModel model) {
    return SuspensionEntity(
      id: model.id,
      playerId: model.playerId,
      teamId: model.teamId,
      leagueId: model.leagueId,
      tournamentId: model.tournamentId,
      suspensionType: SuspensionType.fromString(model.suspensionType),
      reason: model.reason,
      matchesToServe: model.matchesToServe,
      matchesServed: model.matchesServed,
      status: SuspensionStatus.fromString(model.status),
      notes: model.notes,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    );
  }

  /// Convert SuspensionEntity to model for serialization
  static SuspensionModel toModel(SuspensionEntity entity) {
    return SuspensionModel(
      id: entity.id,
      playerId: entity.playerId,
      teamId: entity.teamId,
      leagueId: entity.leagueId,
      tournamentId: entity.tournamentId,
      suspensionType: entity.suspensionType.dbValue,
      reason: entity.reason,
      matchesToServe: entity.matchesToServe,
      matchesServed: entity.matchesServed,
      status: entity.status.name,
      notes: entity.notes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }
}
