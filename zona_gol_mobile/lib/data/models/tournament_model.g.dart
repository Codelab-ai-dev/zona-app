// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tournament_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TournamentModelImpl _$$TournamentModelImplFromJson(
        Map<String, dynamic> json) =>
    _$TournamentModelImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      leagueId: json['league_id'] as String,
      startDate: DateTime.parse(json['start_date'] as String),
      endDate: DateTime.parse(json['end_date'] as String),
      isActive: json['is_active'] as bool? ?? false,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
      maxPlayers: (json['max_players'] as num?)?.toInt(),
      maxCoachingStaff: (json['max_coaching_staff'] as num?)?.toInt() ?? 10,
      tournamentFormat: json['tournament_format'] as String? ?? 'league',
      numberOfGroups: (json['number_of_groups'] as num?)?.toInt(),
      teamsAdvancingPerGroup:
          (json['teams_advancing_per_group'] as num?)?.toInt() ?? 2,
      roundsPerSeason: (json['rounds_per_season'] as num?)?.toInt() ?? 1,
      hasThirdPlaceMatch: json['has_third_place_match'] as bool? ?? false,
    );

Map<String, dynamic> _$$TournamentModelImplToJson(
        _$TournamentModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'league_id': instance.leagueId,
      'start_date': instance.startDate.toIso8601String(),
      'end_date': instance.endDate.toIso8601String(),
      'is_active': instance.isActive,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
      'max_players': instance.maxPlayers,
      'max_coaching_staff': instance.maxCoachingStaff,
      'tournament_format': instance.tournamentFormat,
      'number_of_groups': instance.numberOfGroups,
      'teams_advancing_per_group': instance.teamsAdvancingPerGroup,
      'rounds_per_season': instance.roundsPerSeason,
      'has_third_place_match': instance.hasThirdPlaceMatch,
    };
