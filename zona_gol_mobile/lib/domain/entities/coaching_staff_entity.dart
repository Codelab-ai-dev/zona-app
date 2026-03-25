import 'package:equatable/equatable.dart';

/// Coaching Staff Entity
/// Represents a coaching staff member (cuerpo técnico) in the domain layer
class CoachingStaffEntity extends Equatable {
  final String id;
  final String teamId;
  final String name;
  final String role;
  final String? photo;
  final DateTime? birthDate;
  final String? cedula;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const CoachingStaffEntity({
    required this.id,
    required this.teamId,
    required this.name,
    required this.role,
    this.photo,
    this.birthDate,
    this.cedula,
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id, teamId, name, role, photo, birthDate,
        cedula, isActive, createdAt, updatedAt,
      ];

  /// Display name
  String get displayName => name;

  /// Get initials from name
  String get initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  /// Role display in Spanish
  String get roleDisplay {
    const roleMap = {
      'director_tecnico': 'Director Técnico',
      'head_coach': 'Director Técnico',
      'asistente_tecnico': 'Asistente Técnico',
      'assistant_coach': 'Asistente Técnico',
      'preparador_fisico': 'Preparador Físico',
      'trainer': 'Entrenador',
      'fisioterapeuta': 'Fisioterapeuta',
      'physiotherapist': 'Fisioterapeuta',
      'medico': 'Médico',
      'doctor': 'Médico',
      'manager': 'Manager',
      'utilero': 'Utilero',
      'kinesiologo': 'Kinesiólogo',
    };
    return roleMap[role] ?? role;
  }

  bool get hasPhoto => photo != null && photo!.isNotEmpty;
  bool get hasCedula => cedula != null && cedula!.isNotEmpty;
  String get statusText => isActive ? 'Activo' : 'Inactivo';

  CoachingStaffEntity copyWith({
    String? id,
    String? teamId,
    String? name,
    String? role,
    String? photo,
    DateTime? birthDate,
    String? cedula,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CoachingStaffEntity(
      id: id ?? this.id,
      teamId: teamId ?? this.teamId,
      name: name ?? this.name,
      role: role ?? this.role,
      photo: photo ?? this.photo,
      birthDate: birthDate ?? this.birthDate,
      cedula: cedula ?? this.cedula,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
