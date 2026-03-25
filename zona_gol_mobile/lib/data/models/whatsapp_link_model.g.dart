// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'whatsapp_link_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$WhatsAppLinkModelImpl _$$WhatsAppLinkModelImplFromJson(
        Map<String, dynamic> json) =>
    _$WhatsAppLinkModelImpl(
      id: json['id'] as String,
      phoneNumber: json['phone_number'] as String,
      userId: json['user_id'] as String?,
      role: json['role'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      displayName: json['display_name'] as String?,
      preferredLanguage: json['preferred_language'] as String? ?? 'es',
      lastInteractionAt: json['last_interaction_at'] == null
          ? null
          : DateTime.parse(json['last_interaction_at'] as String),
      leagueId: json['league_id'] as String?,
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
    );

Map<String, dynamic> _$$WhatsAppLinkModelImplToJson(
        _$WhatsAppLinkModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'phone_number': instance.phoneNumber,
      'user_id': instance.userId,
      'role': instance.role,
      'is_active': instance.isActive,
      'display_name': instance.displayName,
      'preferred_language': instance.preferredLanguage,
      'last_interaction_at': instance.lastInteractionAt?.toIso8601String(),
      'league_id': instance.leagueId,
      'created_at': instance.createdAt?.toIso8601String(),
      'updated_at': instance.updatedAt?.toIso8601String(),
    };
