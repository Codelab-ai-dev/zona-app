import 'package:equatable/equatable.dart';

/// League Entity
/// Represents a football league in the business domain
///
/// A league is managed by an admin and can contain multiple tournaments
class LeagueEntity extends Equatable {
  final String id;
  final String name;
  final String slug;
  final String description;
  final String? logo;
  final String adminId;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const LeagueEntity({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    this.logo,
    required this.adminId,
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        name,
        slug,
        description,
        logo,
        adminId,
        isActive,
        createdAt,
        updatedAt,
      ];

  /// Creates a copy of this league with the given fields replaced
  LeagueEntity copyWith({
    String? id,
    String? name,
    String? slug,
    String? description,
    String? logo,
    String? adminId,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return LeagueEntity(
      id: id ?? this.id,
      name: name ?? this.name,
      slug: slug ?? this.slug,
      description: description ?? this.description,
      logo: logo ?? this.logo,
      adminId: adminId ?? this.adminId,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Check if the league is managed by the given user ID
  bool isManagedBy(String userId) {
    return adminId == userId;
  }

  /// Get league status display text
  String get statusText => isActive ? 'Activa' : 'Inactiva';

  /// Generate a display name with status
  String get displayName => '$name ${isActive ? '' : '(Inactiva)'}';

  /// Check if league has a logo
  bool get hasLogo => logo != null && logo!.isNotEmpty;
}
