import 'package:equatable/equatable.dart';

/// Player Entity
/// Represents a player in the domain layer
class PlayerEntity extends Equatable {
  final String id;
  final String teamId;
  final String name;
  final int? jerseyNumber;
  final String? photo;
  final DateTime? birthDate;
  final String? position;
  final bool isActive;
  final String? idDocumentUrl;
  final bool idVerified;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const PlayerEntity({
    required this.id,
    required this.teamId,
    required this.name,
    this.jerseyNumber,
    this.photo,
    this.birthDate,
    this.position,
    this.isActive = true,
    this.idDocumentUrl,
    this.idVerified = false,
    this.createdAt,
    this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        teamId,
        name,
        jerseyNumber,
        photo,
        birthDate,
        position,
        isActive,
        idDocumentUrl,
        idVerified,
        createdAt,
        updatedAt,
      ];

  /// Display name with jersey number
  String get displayName {
    if (jerseyNumber != null) {
      return '#$jerseyNumber $name';
    }
    return name;
  }

  /// Get player initials from name
  String get initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  /// Calculate age from birth date
  int? get age {
    if (birthDate == null) return null;
    final now = DateTime.now();
    int years = now.year - birthDate!.year;
    if (now.month < birthDate!.month ||
        (now.month == birthDate!.month && now.day < birthDate!.day)) {
      years--;
    }
    return years;
  }

  /// Position display in Spanish
  String get positionDisplay {
    if (position == null || position!.isEmpty) return 'N/A';
    final positionMap = {
      'GK': 'Portero',
      'DEF': 'Defensa',
      'MID': 'Mediocampista',
      'FWD': 'Delantero',
      'goalkeeper': 'Portero',
      'defender': 'Defensa',
      'midfielder': 'Mediocampista',
      'forward': 'Delantero',
    };
    return positionMap[position] ?? position!;
  }

  bool get hasPhoto => photo != null && photo!.isNotEmpty;
  bool get hasJerseyNumber => jerseyNumber != null;
  bool get hasPosition => position != null && position!.isNotEmpty;

  /// Status text in Spanish
  String get statusText => isActive ? 'Activo' : 'Inactivo';

  /// Copy with method for updates
  PlayerEntity copyWith({
    String? id,
    String? teamId,
    String? name,
    int? jerseyNumber,
    String? photo,
    DateTime? birthDate,
    String? position,
    bool? isActive,
    String? idDocumentUrl,
    bool? idVerified,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PlayerEntity(
      id: id ?? this.id,
      teamId: teamId ?? this.teamId,
      name: name ?? this.name,
      jerseyNumber: jerseyNumber ?? this.jerseyNumber,
      photo: photo ?? this.photo,
      birthDate: birthDate ?? this.birthDate,
      position: position ?? this.position,
      isActive: isActive ?? this.isActive,
      idDocumentUrl: idDocumentUrl ?? this.idDocumentUrl,
      idVerified: idVerified ?? this.idVerified,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
