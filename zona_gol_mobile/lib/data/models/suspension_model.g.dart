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
      tournamentId: json['tournament_id'] as String,
      matchId: json['match_id'] as String?,
      reason: json['reason'] as String,
      yellowCardCount: (json['yellow_card_count'] as num?)?.toInt() ?? 0,
      matchesSuspended: (json['matches_suspended'] as num?)?.toInt() ?? 1,
      matchesServed: (json['matches_served'] as num?)?.toInt() ?? 0,
      isActive: json['is_active'] as bool? ?? true,
      suspendedAt: DateTime.parse(json['suspended_at'] as String),
      expiresAt: json['expires_at'] == null
          ? null
          : DateTime.parse(json['expires_at'] as String),
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
      'tournament_id': instance.tournamentId,
      'match_id': instance.matchId,
      'reason': instance.reason,
      'yellow_card_count': instance.yellowCardCount,
      'matches_suspended': instance.matchesSuspended,
      'matches_served': instance.matchesServed,
      'is_active': instance.isActive,
      'suspended_at': instance.suspendedAt.toIso8601String(),
      'expires_at': instance.expiresAt?.toIso8601String(),
      'notes': instance.notes,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
