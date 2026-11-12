import '../../core/network/json.dart';
import '../../domain/entities/suspension_entity.dart';

/// Maps the API's `Suspension` (`stats.Suspension`) to [SuspensionEntity].
class SuspensionMapper {
  static SuspensionEntity fromJson(Map<String, dynamic> json) {
    final reason = json.strOrNull('reason');
    final jersey = json.intOrNull('player_jersey');
    return SuspensionEntity(
      id: json.str('id'),
      playerId: json.str('player_id'),
      teamId: json.str('team_id'),
      leagueId: json.str('league_id'),
      tournamentId: json.strOrNull('tournament_id'),
      suspensionType: SuspensionType.fromString(json.str('suspension_type', 'other')),
      reason: (reason == null || reason.isEmpty) ? null : reason,
      matchesToServe: json.integer('matches_to_serve', 1),
      matchesServed: json.integer('matches_served'),
      status: SuspensionStatus.fromString(json.str('status', 'active')),
      notes: json.strOrNull('notes'),
      createdAt: json.dateOrNull('created_at'),
      updatedAt: json.dateOrNull('updated_at'),
      playerName: json.strOrNull('player_name'),
      // Omitted when zero (`omitempty`); 0 is not a real jersey.
      jerseyNumber: (jersey == null || jersey == 0) ? null : jersey,
      teamName: json.strOrNull('team_name'),
    );
  }
}
