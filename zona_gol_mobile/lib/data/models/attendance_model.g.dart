// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'attendance_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$AttendanceModelImpl _$$AttendanceModelImplFromJson(
        Map<String, dynamic> json) =>
    _$AttendanceModelImpl(
      id: json['id'] as String,
      matchId: json['match_id'] as String,
      playerId: json['player_id'] as String,
      teamId: json['team_id'] as String,
      checkedInAt: DateTime.parse(json['checked_in_at'] as String),
      recognitionMode: json['recognition_mode'] as String? ?? 'quick',
      deviceInfo: json['device_info'] as String?,
      scannedByUserId: json['scanned_by_user_id'] as String?,
      serverTimestamp: json['server_timestamp'] == null
          ? null
          : DateTime.parse(json['server_timestamp'] as String),
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
    );

Map<String, dynamic> _$$AttendanceModelImplToJson(
        _$AttendanceModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'match_id': instance.matchId,
      'player_id': instance.playerId,
      'team_id': instance.teamId,
      'checked_in_at': instance.checkedInAt.toIso8601String(),
      'recognition_mode': instance.recognitionMode,
      'device_info': instance.deviceInfo,
      'scanned_by_user_id': instance.scannedByUserId,
      'server_timestamp': instance.serverTimestamp?.toIso8601String(),
      'created_at': instance.createdAt?.toIso8601String(),
    };
