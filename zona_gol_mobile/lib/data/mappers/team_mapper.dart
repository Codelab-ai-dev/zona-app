import '../../core/network/json.dart';
import '../../domain/entities/team_entity.dart';

/// Team Mapper: API team (`GET /teams`, `/teams/{id}`, `/my-teams`) -> TeamEntity.
class TeamMapper {
  static TeamEntity fromJson(Map<String, dynamic> json) => TeamEntity(
        id: json.str('id'),
        name: json.str('name'),
        slug: json.str('slug'),
        leagueId: json.str('league_id'),
        tournamentId: _nonEmpty(json.strOrNull('tournament_id')),
        ownerId: json.str('owner_id'),
        logo: _nonEmpty(json.strOrNull('logo')),
        description: json.strOrNull('description'),
        isActive: json.boolean('is_active', true),
        createdAt: json.dateOrNull('created_at'),
        updatedAt: json.dateOrNull('updated_at'),
        homePrimaryColor: json.strOrNull('home_primary_color'),
        homeSecondaryColor: json.strOrNull('home_secondary_color'),
        homeAccentColor: json.strOrNull('home_accent_color'),
        awayPrimaryColor: json.strOrNull('away_primary_color'),
        awaySecondaryColor: json.strOrNull('away_secondary_color'),
        awayAccentColor: json.strOrNull('away_accent_color'),
        groupName: _nonEmpty(json.strOrNull('group_name')),
      );

  static String? _nonEmpty(String? v) => v == null || v.isEmpty ? null : v;
}
