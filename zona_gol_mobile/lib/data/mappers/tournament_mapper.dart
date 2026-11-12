import '../../core/network/json.dart';
import '../../domain/entities/tournament_entity.dart';

/// Tournament Mapper: Go API tournament JSON (`leagues.Tournament`) <-> TournamentEntity.
class TournamentMapper {
  /// From `GET /tournaments/{id}`, `GET /leagues/{id}/tournaments`, `POST /tournaments`.
  static TournamentEntity fromJson(Map<String, dynamic> json) {
    final created = json.dateOrNull('created_at');
    return TournamentEntity(
      id: json.str('id'),
      name: json.str('name'),
      leagueId: json.str('league_id'),
      startDate: json.dateOrNull('start_date') ?? created ?? DateTime.now(),
      endDate: json.dateOrNull('end_date') ?? created ?? DateTime.now(),
      isActive: json.boolean('is_active'),
      createdAt: created,
      updatedAt: json.dateOrNull('updated_at'),
      maxPlayers: json.intOrNull('max_players'),
      maxCoachingStaff: json.integer('max_coaching_staff', 10),
      format: json.str('tournament_format', 'league').toTournamentFormat(),
      numberOfGroups: json.intOrNull('number_of_groups'),
      teamsAdvancingPerGroup: json.integer('teams_advancing_per_group', 2),
      roundsPerSeason: json.integer('rounds_per_season', 1),
      hasThirdPlaceMatch: json.boolean('has_third_place_match'),
      ageValidationEnabled: json.boolean('age_validation_enabled'),
      minAge: json.intOrNull('min_age'),
      maxAge: json.intOrNull('max_age'),
      ageReferenceDate: json.dateOrNull('age_reference_date'),
      ageExceptionCount: json.integer('age_exception_count'),
      ageExceptionMinAge: json.intOrNull('age_exception_min_age'),
      ageExceptionMaxAge: json.intOrNull('age_exception_max_age'),
    );
  }

  /// Body of `POST /tournaments` (leagues.CreateTournamentRequest).
  /// New tournaments start inactive, as before.
  static Map<String, dynamic> createJson({
    required String name,
    required String leagueId,
    required DateTime startDate,
    required DateTime endDate,
    int? maxPlayers,
    int maxCoachingStaff = 10,
    TournamentFormat format = TournamentFormat.league,
    int? numberOfGroups,
    int teamsAdvancingPerGroup = 2,
    int roundsPerSeason = 1,
    bool hasThirdPlaceMatch = false,
  }) =>
      {
        'league_id': leagueId,
        'name': name,
        'start_date': apiDate(startDate),
        'end_date': apiDate(endDate),
        'is_active': false,
        if (maxPlayers != null) 'max_players': maxPlayers,
        'max_coaching_staff': maxCoachingStaff,
        'tournament_format': format.toDbString(),
        if (numberOfGroups != null) 'number_of_groups': numberOfGroups,
        'teams_advancing_per_group': teamsAdvancingPerGroup,
        'rounds_per_season': roundsPerSeason,
        'has_third_place_match': hasThirdPlaceMatch,
      };
}
