import '../../core/network/json.dart';
import '../../domain/entities/coaching_staff_entity.dart';

/// Coaching Staff Mapper.
///
/// `GET /teams/{id}/coaching-staff` returns the public shape (no birth_date
/// nor cedula); create/update responses carry every field.
class CoachingStaffMapper {
  static CoachingStaffEntity fromJson(Map<String, dynamic> json) => CoachingStaffEntity(
        id: json.str('id'),
        teamId: json.str('team_id'),
        name: json.str('name'),
        role: json.str('role'),
        photo: _nonEmpty(json.strOrNull('photo')),
        birthDate: json.dateOrNull('birth_date'),
        cedula: _nonEmpty(json.strOrNull('cedula')),
        isActive: json.boolean('is_active', true),
        createdAt: json.dateOrNull('created_at'),
        updatedAt: json.dateOrNull('updated_at'),
      );

  static String? _nonEmpty(String? v) => v == null || v.isEmpty ? null : v;
}
