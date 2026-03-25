import '../../domain/entities/team_standing_entity.dart';

/// Mapper for TeamStandingEntity
class TeamStandingMapper {
  /// Convert JSON from team_stats table to TeamStandingEntity
  static TeamStandingEntity fromJson(Map<String, dynamic> json) {
    // Handle nested team data
    final team = json['teams'] as Map<String, dynamic>?;

    return TeamStandingEntity(
      id: json['id']?.toString() ?? '',
      teamId: json['team_id']?.toString() ?? '',
      leagueId: json['league_id']?.toString(),
      tournamentId: json['tournament_id']?.toString(),
      teamName: team?['name']?.toString() ?? json['team_name']?.toString() ?? 'Sin nombre',
      teamLogo: team?['logo']?.toString() ?? json['team_logo']?.toString(),
      groupName: team?['group_name']?.toString() ?? json['group_name']?.toString(),
      matchesPlayed: _parseInt(json['matches_played']),
      matchesWon: _parseInt(json['matches_won']),
      matchesDrawn: _parseInt(json['matches_drawn']),
      matchesLost: _parseInt(json['matches_lost']),
      goalsFor: _parseInt(json['goals_for']),
      goalsAgainst: _parseInt(json['goals_against']),
      goalDifference: _parseInt(json['goal_difference']),
      points: _parseInt(json['points']),
      pointsAdjustment: _parseInt(json['points_adjustment']),
      adjustmentReason: json['adjustment_reason']?.toString(),
      cleanSheets: json['clean_sheets'] != null ? _parseInt(json['clean_sheets']) : null,
      yellowCards: json['yellow_cards'] != null ? _parseInt(json['yellow_cards']) : null,
      redCards: json['red_cards'] != null ? _parseInt(json['red_cards']) : null,
      recentForm: json['recent_form']?.toString(),
    );
  }

  /// Convert a list of JSON objects to a list of TeamStandingEntity
  static List<TeamStandingEntity> fromJsonList(List<dynamic> jsonList) {
    return jsonList
        .map((json) => fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Sort standings by:
  /// 1. Total points (descending)
  /// 2. Goal difference (descending)
  /// 3. Goals for (descending)
  /// 4. Team name (alphabetical)
  static List<TeamStandingEntity> sortStandings(List<TeamStandingEntity> standings) {
    final sorted = List<TeamStandingEntity>.from(standings);
    sorted.sort((a, b) {
      // First compare by total points
      final pointsCompare = b.totalPoints.compareTo(a.totalPoints);
      if (pointsCompare != 0) return pointsCompare;

      // Then by goal difference
      final gdCompare = b.goalDifference.compareTo(a.goalDifference);
      if (gdCompare != 0) return gdCompare;

      // Then by goals for
      final gfCompare = b.goalsFor.compareTo(a.goalsFor);
      if (gfCompare != 0) return gfCompare;

      // Finally by team name
      return a.teamName.compareTo(b.teamName);
    });
    return sorted;
  }

  static int _parseInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }
}
