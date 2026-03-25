// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'suspension_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$SuspensionModelImpl _$$SuspensionModelImplFromJson(
        Map<String, dynamic> json) =>
    _$SuspensionModelImpl(
      id: json['id'] as String,
      playerId: json['player_id'] as String,
      teamId: json['team_id'] as String,
      leagueId: json['league_id'] as String,
      tournamentId: json['tournament_id'] as String?,
      suspensionType: json['suspension_type'] as String,
      reason: json['reason'] as String?,
      matchesToServe: (json['matches_to_serve'] as num?)?.toInt() ?? 1,
      matchesServed: (json['matches_served'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'active',
      notes: json['notes'] as String?,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
    );

Map<String, dynamic> _$$SuspensionModelImplToJson(
        _$SuspensionModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'player_id': instance.playerId,
      'team_id': instance.teamId,
      'league_id': instance.leagueId,
      'tournament_id': instance.tournamentId,
      'suspension_type': instance.suspensionType,
      'reason': instance.reason,
      'matches_to_serve': instance.matchesToServe,
      'matches_served': instance.matchesServed,
      'status': instance.status,
      'notes': instance.notes,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
