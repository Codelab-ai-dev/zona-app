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
      firstName: json['first_name'] as String,
      lastName: json['last_name'] as String,
      role: json['role'] as String,
      photoUrl: json['photo_url'] as String?,
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

Map<String, dynamic> _$$CoachingStaffModelImplToJson(
        _$CoachingStaffModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'team_id': instance.teamId,
      'first_name': instance.firstName,
      'last_name': instance.lastName,
      'role': instance.role,
      'photo_url': instance.photoUrl,
      'email': instance.email,
      'phone_number': instance.phoneNumber,
      'is_active': instance.isActive,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
