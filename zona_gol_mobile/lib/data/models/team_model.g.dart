// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'team_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TeamModelImpl _$$TeamModelImplFromJson(Map<String, dynamic> json) =>
    _$TeamModelImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      leagueId: json['league_id'] as String,
      tournamentId: json['tournament_id'] as String?,
      ownerId: json['owner_id'] as String,
      logo: json['logo'] as String?,
      description: json['description'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
      homePrimaryColor: json['home_primary_color'] as String?,
      homeSecondaryColor: json['home_secondary_color'] as String?,
      homeAccentColor: json['home_accent_color'] as String?,
      awayPrimaryColor: json['away_primary_color'] as String?,
      awaySecondaryColor: json['away_secondary_color'] as String?,
      awayAccentColor: json['away_accent_color'] as String?,
      groupName: json['group_name'] as String?,
    );

Map<String, dynamic> _$$TeamModelImplToJson(_$TeamModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'slug': instance.slug,
      'league_id': instance.leagueId,
      'tournament_id': instance.tournamentId,
      'owner_id': instance.ownerId,
      'logo': instance.logo,
      'description': instance.description,
      'is_active': instance.isActive,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
      'home_primary_color': instance.homePrimaryColor,
      'home_secondary_color': instance.homeSecondaryColor,
      'home_accent_color': instance.homeAccentColor,
      'away_primary_color': instance.awayPrimaryColor,
      'away_secondary_color': instance.awaySecondaryColor,
      'away_accent_color': instance.awayAccentColor,
      'group_name': instance.groupName,
    };
