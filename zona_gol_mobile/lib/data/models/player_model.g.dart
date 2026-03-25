// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'player_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$PlayerModelImpl _$$PlayerModelImplFromJson(Map<String, dynamic> json) =>
    _$PlayerModelImpl(
      id: json['id'] as String,
      teamId: json['team_id'] as String,
      name: json['name'] as String,
      jerseyNumber: (json['jersey_number'] as num?)?.toInt(),
      photo: json['photo'] as String?,
      birthDate: json['birth_date'] == null
          ? null
          : DateTime.parse(json['birth_date'] as String),
      position: json['position'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      idDocumentUrl: json['id_document_url'] as String?,
      idVerified: json['id_verified'] as bool? ?? false,
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
      'name': instance.name,
      'jersey_number': instance.jerseyNumber,
      'photo': instance.photo,
      'birth_date': instance.birthDate?.toIso8601String(),
      'position': instance.position,
      'is_active': instance.isActive,
      'id_document_url': instance.idDocumentUrl,
      'id_verified': instance.idVerified,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
