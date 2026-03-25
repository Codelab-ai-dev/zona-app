import 'package:freezed_annotation/freezed_annotation.dart';

part 'whatsapp_link_model.freezed.dart';
part 'whatsapp_link_model.g.dart';

@freezed
class WhatsAppLinkModel with _$WhatsAppLinkModel {
  const WhatsAppLinkModel._();

  @JsonSerializable(fieldRename: FieldRename.snake)
  const factory WhatsAppLinkModel({
    required String id,
    @JsonKey(name: 'phone_number') required String phoneNumber,
    @JsonKey(name: 'user_id') String? userId,
    String? role,
    @JsonKey(name: 'is_active') @Default(true) bool isActive,
    @JsonKey(name: 'display_name') String? displayName,
    @JsonKey(name: 'preferred_language') @Default('es') String preferredLanguage,
    @JsonKey(name: 'last_interaction_at') DateTime? lastInteractionAt,
    @JsonKey(name: 'league_id') String? leagueId,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _WhatsAppLinkModel;

  factory WhatsAppLinkModel.fromJson(Map<String, dynamic> json) =>
      _$WhatsAppLinkModelFromJson(json);
}
