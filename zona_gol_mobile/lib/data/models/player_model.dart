import 'package:freezed_annotation/freezed_annotation.dart';

part 'player_model.freezed.dart';
part 'player_model.g.dart';

@freezed
class PlayerModel with _$PlayerModel {
  const PlayerModel._();

  const factory PlayerModel({
    required String id,
    @JsonKey(name: 'team_id') required String teamId,
    required String name,
    @JsonKey(name: 'jersey_number') int? jerseyNumber,
    String? photo,
    @JsonKey(name: 'birth_date') DateTime? birthDate,
    String? position,
    @JsonKey(name: 'is_active') @Default(true) bool isActive,
    @JsonKey(name: 'id_document_url') String? idDocumentUrl,
    @JsonKey(name: 'id_verified') @Default(false) bool idVerified,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _PlayerModel;

  factory PlayerModel.fromJson(Map<String, dynamic> json) =>
      _$PlayerModelFromJson(json);
}
