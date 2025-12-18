// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'match_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$MatchModelImpl _$$MatchModelImplFromJson(Map<String, dynamic> json) =>
    _$MatchModelImpl(
      id: json['id'] as String,
      tournamentId: json['tournament_id'] as String,
      homeTeamId: json['home_team_id'] as String,
      awayTeamId: json['away_team_id'] as String,
      matchDate: DateTime.parse(json['match_date'] as String),
      location: json['location'] as String?,
      jornadaNumber: (json['jornada_number'] as num?)?.toInt(),
      status: json['status'] as String,
      phase: json['phase'] as String?,
      playoffRound: json['playoff_round'] as String?,
      homeScore: (json['home_score'] as num?)?.toInt(),
      awayScore: (json['away_score'] as num?)?.toInt(),
      refereeNotes: json['referee_notes'] as String?,
      isForfeit: json['is_forfeit'] as bool? ?? false,
      forfeitWinner: json['forfeit_winner'] as String?,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
    );

Map<String, dynamic> _$$MatchModelImplToJson(_$MatchModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'tournament_id': instance.tournamentId,
      'home_team_id': instance.homeTeamId,
      'away_team_id': instance.awayTeamId,
      'match_date': instance.matchDate.toIso8601String(),
      'location': instance.location,
      'jornada_number': instance.jornadaNumber,
      'status': instance.status,
      'phase': instance.phase,
      'playoff_round': instance.playoffRound,
      'home_score': instance.homeScore,
      'away_score': instance.awayScore,
      'referee_notes': instance.refereeNotes,
      'is_forfeit': instance.isForfeit,
      'forfeit_winner': instance.forfeitWinner,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
