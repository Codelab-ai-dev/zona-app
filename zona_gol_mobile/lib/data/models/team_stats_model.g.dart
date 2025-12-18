// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'team_stats_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TeamStatsModelImpl _$$TeamStatsModelImplFromJson(Map<String, dynamic> json) =>
    _$TeamStatsModelImpl(
      id: json['id'] as String,
      teamId: json['team_id'] as String,
      tournamentId: json['tournament_id'] as String,
      matchesPlayed: (json['matches_played'] as num?)?.toInt() ?? 0,
      matchesWon: (json['matches_won'] as num?)?.toInt() ?? 0,
      matchesDrawn: (json['matches_drawn'] as num?)?.toInt() ?? 0,
      matchesLost: (json['matches_lost'] as num?)?.toInt() ?? 0,
      goalsFor: (json['goals_for'] as num?)?.toInt() ?? 0,
      goalsAgainst: (json['goals_against'] as num?)?.toInt() ?? 0,
      points: (json['points'] as num?)?.toInt() ?? 0,
      yellowCards: (json['yellow_cards'] as num?)?.toInt() ?? 0,
      redCards: (json['red_cards'] as num?)?.toInt() ?? 0,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
    );

Map<String, dynamic> _$$TeamStatsModelImplToJson(
        _$TeamStatsModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'team_id': instance.teamId,
      'tournament_id': instance.tournamentId,
      'matches_played': instance.matchesPlayed,
      'matches_won': instance.matchesWon,
      'matches_drawn': instance.matchesDrawn,
      'matches_lost': instance.matchesLost,
      'goals_for': instance.goalsFor,
      'goals_against': instance.goalsAgainst,
      'points': instance.points,
      'yellow_cards': instance.yellowCards,
      'red_cards': instance.redCards,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
