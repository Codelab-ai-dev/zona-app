// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'player_stats_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$PlayerStatsModelImpl _$$PlayerStatsModelImplFromJson(
        Map<String, dynamic> json) =>
    _$PlayerStatsModelImpl(
      id: json['id'] as String,
      playerId: json['player_id'] as String,
      tournamentId: json['tournament_id'] as String,
      matchesPlayed: (json['matches_played'] as num?)?.toInt() ?? 0,
      goals: (json['goals'] as num?)?.toInt() ?? 0,
      assists: (json['assists'] as num?)?.toInt() ?? 0,
      yellowCards: (json['yellow_cards'] as num?)?.toInt() ?? 0,
      redCards: (json['red_cards'] as num?)?.toInt() ?? 0,
      minutesPlayed: (json['minutes_played'] as num?)?.toInt() ?? 0,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
    );

Map<String, dynamic> _$$PlayerStatsModelImplToJson(
        _$PlayerStatsModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'player_id': instance.playerId,
      'tournament_id': instance.tournamentId,
      'matches_played': instance.matchesPlayed,
      'goals': instance.goals,
      'assists': instance.assists,
      'yellow_cards': instance.yellowCards,
      'red_cards': instance.redCards,
      'minutes_played': instance.minutesPlayed,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
