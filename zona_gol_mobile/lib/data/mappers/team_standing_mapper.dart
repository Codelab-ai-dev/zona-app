import '../../core/network/json.dart';
import '../../domain/entities/team_standing_entity.dart';

/// Team Standing Mapper: `GET /tournaments/{id}/standings` rows -> entity.
///
/// The rows have no id of their own: the team id identifies them within the
/// tournament. `points` excludes `points_adjustment` (see totalPoints).
class TeamStandingMapper {
  static TeamStandingEntity fromJson(Map<String, dynamic> json, {String? tournamentId}) {
    final group = json.strOrNull('group_name');
    final form = json.strOrNull('recent_form');
    return TeamStandingEntity(
      id: json.str('team_id'),
      teamId: json.str('team_id'),
      tournamentId: tournamentId,
      teamName: json.str('team_name', 'Sin nombre'),
      teamLogo: json.strOrNull('team_logo'),
      groupName: group == null || group.isEmpty ? null : group,
      matchesPlayed: json.integer('matches_played'),
      matchesWon: json.integer('matches_won'),
      matchesDrawn: json.integer('matches_drawn'),
      matchesLost: json.integer('matches_lost'),
      goalsFor: json.integer('goals_for'),
      goalsAgainst: json.integer('goals_against'),
      goalDifference: json.integer('goal_difference'),
      points: json.integer('points'),
      pointsAdjustment: json.integer('points_adjustment'),
      adjustmentReason: json.strOrNull('adjustment_reason'),
      recentForm: form == null || form.isEmpty ? null : form,
      position: json.integer('position'),
    );
  }

  /// Keeps the API's order: it ranks the table in one place for every
  /// client (#85). Only rows without a position (older API) are sorted here,
  /// by total points, goal difference and goals for.
  static List<TeamStandingEntity> sortStandings(List<TeamStandingEntity> standings) {
    final sorted = List<TeamStandingEntity>.from(standings);
    if (sorted.every((s) => s.position > 0)) {
      sorted.sort((a, b) => a.position.compareTo(b.position));
      return sorted;
    }
    sorted.sort((a, b) {
      final points = b.totalPoints.compareTo(a.totalPoints);
      if (points != 0) return points;
      final gd = b.goalDifference.compareTo(a.goalDifference);
      if (gd != 0) return gd;
      final gf = b.goalsFor.compareTo(a.goalsFor);
      if (gf != 0) return gf;
      return a.teamName.compareTo(b.teamName);
    });
    return sorted;
  }
}
