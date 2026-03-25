// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'coaching_staff_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CoachingStaffModelImpl _$$CoachingStaffModelImplFromJson(
        Map<String, dynamic> json) =>
    _$CoachingStaffModelImpl(
      id: json['id'] as String,
      teamId: json['team_id'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
      photo: json['photo'] as String?,
      birthDate: json['birth_date'] == null
          ? null
          : DateTime.parse(json['birth_date'] as String),
      cedula: json['cedula'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
    );

Map<String, dynamic> _$$CoachingStaffModelImplToJson(
        _$CoachingStaffModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'team_id': instance.teamId,
      'name': instance.name,
      'role': instance.role,
      'photo': instance.photo,
      'birth_date': instance.birthDate?.toIso8601String(),
      'cedula': instance.cedula,
      'is_active': instance.isActive,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
