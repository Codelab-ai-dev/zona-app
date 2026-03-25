import '../../domain/entities/match_entity.dart';

/// Match Mapper
/// Converts JSON data to MatchEntity and vice versa
class MatchMapper {
  /// Convert JSON to MatchEntity
  static MatchEntity fromJson(Map<String, dynamic> json) {
    // Parse home team
    MatchTeamInfo? homeTeam;
    if (json['home_team'] != null) {
      final teamData = json['home_team'] as Map<String, dynamic>;
      homeTeam = MatchTeamInfo(
        id: teamData['id'] as String,
        name: teamData['name'] as String,
        logo: teamData['logo'] as String?,
        slug: teamData['slug'] as String?,
      );
    }

    // Parse away team
    MatchTeamInfo? awayTeam;
    if (json['away_team'] != null) {
      final teamData = json['away_team'] as Map<String, dynamic>;
      awayTeam = MatchTeamInfo(
        id: teamData['id'] as String,
        name: teamData['name'] as String,
        logo: teamData['logo'] as String?,
        slug: teamData['slug'] as String?,
      );
    }

    // Parse tournament name
    String? tournamentName;
    if (json['tournament'] != null) {
      final tournamentData = json['tournament'] as Map<String, dynamic>;
      tournamentName = tournamentData['name'] as String?;
    }

    return MatchEntity(
      id: json['id'] as String,
      tournamentId: json['tournament_id'] as String,
      homeTeamId: json['home_team_id'] as String,
      awayTeamId: json['away_team_id'] as String,
      homeScore: json['home_score'] as int?,
      awayScore: json['away_score'] as int?,
      matchDate: DateTime.parse(json['match_date'] as String),
      matchTime: json['match_time'] as String?,
      fieldNumber: json['field_number'] as int?,
      round: json['round'] as int?,
      status: (json['status'] as String? ?? 'scheduled').toMatchStatus(),
      phase: (json['phase'] as String? ?? 'regular').toMatchPhase(),
      playoffRound: (json['playoff_round'] as String?)?.toPlayoffRound(),
      playoffPosition: json['playoff_position'] as int?,
      leg: (json['leg'] as String?)?.toMatchLeg(),
      isPublished: json['is_published'] as bool? ?? false,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      tournamentName: tournamentName,
    );
  }

  /// Convert MatchEntity to JSON
  static Map<String, dynamic> toJson(MatchEntity entity) {
    return {
      'id': entity.id,
      'tournament_id': entity.tournamentId,
      'home_team_id': entity.homeTeamId,
      'away_team_id': entity.awayTeamId,
      'home_score': entity.homeScore,
      'away_score': entity.awayScore,
      'match_date': entity.matchDate.toIso8601String().split('T')[0],
      'match_time': entity.matchTime,
      'field_number': entity.fieldNumber,
      'round': entity.round,
      'status': entity.status.toDbString(),
      'phase': entity.phase == MatchPhase.playoffs ? 'playoffs' : 'regular',
      'playoff_round': entity.playoffRound?.toDbString(),
      'playoff_position': entity.playoffPosition,
      'leg': entity.leg?.name,
      'is_published': entity.isPublished,
    };
  }
}
