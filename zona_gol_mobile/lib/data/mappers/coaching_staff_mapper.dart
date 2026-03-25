import '../../domain/entities/coaching_staff_entity.dart';
import '../models/coaching_staff_model.dart';

/// Coaching Staff Mapper
/// Converts between CoachingStaffModel and CoachingStaffEntity
class CoachingStaffMapper {
  static CoachingStaffEntity toEntity(CoachingStaffModel model) {
    return CoachingStaffEntity(
      id: model.id,
      teamId: model.teamId,
      name: model.name,
      role: model.role,
      photo: model.photo,
      birthDate: model.birthDate,
      cedula: model.cedula,
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    );
  }

  static CoachingStaffModel toModel(CoachingStaffEntity entity) {
    return CoachingStaffModel(
      id: entity.id,
      teamId: entity.teamId,
      name: entity.name,
      role: entity.role,
      photo: entity.photo,
      birthDate: entity.birthDate,
      cedula: entity.cedula,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }

  static CoachingStaffEntity fromJson(Map<String, dynamic> json) {
    final model = CoachingStaffModel.fromJson(json);
    return toEntity(model);
  }
}
