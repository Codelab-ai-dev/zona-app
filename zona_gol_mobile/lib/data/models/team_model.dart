import 'package:freezed_annotation/freezed_annotation.dart';

part 'team_model.freezed.dart';
part 'team_model.g.dart';

/// Team Model
/// Freezed data model for Team that matches the database schema
@freezed
class TeamModel with _$TeamModel {
  const TeamModel._();

  const factory TeamModel({
    required String id,
    required String name,
    required String slug,
    @JsonKey(name: 'league_id') required String leagueId,
    @JsonKey(name: 'tournament_id') String? tournamentId,
    @JsonKey(name: 'owner_id') required String ownerId,
    String? logo,
    String? description,
    @JsonKey(name: 'is_active') @Default(true) bool isActive,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
    // Uniform Colors
    @JsonKey(name: 'home_primary_color') String? homePrimaryColor,
    @JsonKey(name: 'home_secondary_color') String? homeSecondaryColor,
    @JsonKey(name: 'home_accent_color') String? homeAccentColor,
    @JsonKey(name: 'away_primary_color') String? awayPrimaryColor,
    @JsonKey(name: 'away_secondary_color') String? awaySecondaryColor,
    @JsonKey(name: 'away_accent_color') String? awayAccentColor,
    // Group for tournaments
    @JsonKey(name: 'group_name') String? groupName,
  }) = _TeamModel;

  factory TeamModel.fromJson(Map<String, dynamic> json) =>
      _$TeamModelFromJson(json);
}
