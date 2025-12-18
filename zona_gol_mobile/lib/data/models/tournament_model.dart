import 'package:freezed_annotation/freezed_annotation.dart';

part 'tournament_model.freezed.dart';
part 'tournament_model.g.dart';

/// Tournament Model
/// Freezed data model for Tournament that matches the database schema
@freezed
class TournamentModel with _$TournamentModel {
  const TournamentModel._();

  const factory TournamentModel({
    required String id,
    required String name,
    @JsonKey(name: 'league_id') required String leagueId,
    @JsonKey(name: 'start_date') required DateTime startDate,
    @JsonKey(name: 'end_date') required DateTime endDate,
    @JsonKey(name: 'is_active') @Default(false) bool isActive,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
    // Configuration
    @JsonKey(name: 'max_players') int? maxPlayers,
    @JsonKey(name: 'max_coaching_staff') @Default(10) int maxCoachingStaff,
    // Tournament Format
    @JsonKey(name: 'tournament_format') @Default('league') String tournamentFormat,
    @JsonKey(name: 'number_of_groups') int? numberOfGroups,
    @JsonKey(name: 'teams_advancing_per_group') @Default(2) int teamsAdvancingPerGroup,
    @JsonKey(name: 'rounds_per_season') @Default(1) int roundsPerSeason,
    @JsonKey(name: 'has_third_place_match') @Default(false) bool hasThirdPlaceMatch,
  }) = _TournamentModel;

  factory TournamentModel.fromJson(Map<String, dynamic> json) =>
      _$TournamentModelFromJson(json);
}
