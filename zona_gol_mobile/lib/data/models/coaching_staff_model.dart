import 'package:freezed_annotation/freezed_annotation.dart';

part 'coaching_staff_model.freezed.dart';
part 'coaching_staff_model.g.dart';

@freezed
class CoachingStaffModel with _$CoachingStaffModel {
  const CoachingStaffModel._();

  const factory CoachingStaffModel({
    required String id,
    @JsonKey(name: 'team_id') required String teamId,
    @JsonKey(name: 'first_name') required String firstName,
    @JsonKey(name: 'last_name') required String lastName,
    required String role, // 'head_coach', 'assistant_coach', 'trainer', 'physiotherapist', etc.
    @JsonKey(name: 'photo_url') String? photoUrl,
    String? email,
    @JsonKey(name: 'phone_number') String? phoneNumber,
    @JsonKey(name: 'is_active') @Default(true) bool isActive,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _CoachingStaffModel;

  factory CoachingStaffModel.fromJson(Map<String, dynamic> json) =>
      _$CoachingStaffModelFromJson(json);

  // Helper methods
  String get fullName => '$firstName $lastName';

  String get displayName => fullName;

  String get initials {
    return '${firstName.isNotEmpty ? firstName[0] : ""}${lastName.isNotEmpty ? lastName[0] : ""}'.toUpperCase();
  }

  bool get hasPhoto => photoUrl != null && photoUrl!.isNotEmpty;

  String get roleDisplay {
    final roleMap = {
      'head_coach': 'Director Técnico',
      'assistant_coach': 'Asistente Técnico',
      'trainer': 'Entrenador',
      'physiotherapist': 'Fisioterapeuta',
      'doctor': 'Médico',
      'manager': 'Manager',
      'scout': 'Scout',
      'analyst': 'Analista',
    };

    return roleMap[role] ?? role;
  }

  bool get isHeadCoach => role == 'head_coach';
  bool get isAssistantCoach => role == 'assistant_coach';
  bool get isTrainer => role == 'trainer';
  bool get isPhysiotherapist => role == 'physiotherapist';
  bool get isDoctor => role == 'doctor';
}
