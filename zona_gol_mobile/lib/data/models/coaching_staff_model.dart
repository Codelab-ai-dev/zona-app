import 'package:freezed_annotation/freezed_annotation.dart';

part 'coaching_staff_model.freezed.dart';
part 'coaching_staff_model.g.dart';

@freezed
class CoachingStaffModel with _$CoachingStaffModel {
  const factory CoachingStaffModel({
    required String id,
    @JsonKey(name: 'team_id') required String teamId,
    required String name,
    required String role,
    String? photo,
    @JsonKey(name: 'birth_date') DateTime? birthDate,
    String? cedula,
    @JsonKey(name: 'is_active') @Default(true) bool isActive,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _CoachingStaffModel;

  factory CoachingStaffModel.fromJson(Map<String, dynamic> json) =>
      _$CoachingStaffModelFromJson(json);
}
