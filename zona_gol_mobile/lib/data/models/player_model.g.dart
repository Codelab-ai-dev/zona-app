// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'player_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$PlayerModelImpl _$$PlayerModelImplFromJson(Map<String, dynamic> json) =>
    _$PlayerModelImpl(
      id: json['id'] as String,
      teamId: json['team_id'] as String,
      firstName: json['first_name'] as String,
      lastName: json['last_name'] as String,
      jerseyNumber: (json['jersey_number'] as num?)?.toInt(),
      photoUrl: json['photo_url'] as String?,
      dateOfBirth: json['date_of_birth'] == null
          ? null
          : DateTime.parse(json['date_of_birth'] as String),
      position: json['position'] as String?,
      email: json['email'] as String?,
      phoneNumber: json['phone_number'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
    );

Map<String, dynamic> _$$PlayerModelImplToJson(_$PlayerModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'team_id': instance.teamId,
      'first_name': instance.firstName,
      'last_name': instance.lastName,
      'jersey_number': instance.jerseyNumber,
      'photo_url': instance.photoUrl,
      'date_of_birth': instance.dateOfBirth?.toIso8601String(),
      'position': instance.position,
      'email': instance.email,
      'phone_number': instance.phoneNumber,
      'is_active': instance.isActive,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
