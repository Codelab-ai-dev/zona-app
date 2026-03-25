import 'package:equatable/equatable.dart';

/// WhatsApp Link Entity
/// Represents a WhatsApp user link in the domain layer
class WhatsAppLinkEntity extends Equatable {
  final String id;
  final String phoneNumber;
  final String? userId;
  final String? role;
  final bool isActive;
  final String? displayName;
  final String preferredLanguage;
  final DateTime? lastInteractionAt;
  final String? leagueId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const WhatsAppLinkEntity({
    required this.id,
    required this.phoneNumber,
    this.userId,
    this.role,
    this.isActive = true,
    this.displayName,
    this.preferredLanguage = 'es',
    this.lastInteractionAt,
    this.leagueId,
    this.createdAt,
    this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        phoneNumber,
        userId,
        role,
        isActive,
        displayName,
        preferredLanguage,
        lastInteractionAt,
        leagueId,
        createdAt,
        updatedAt,
      ];

  /// Copy with method for updates
  WhatsAppLinkEntity copyWith({
    String? id,
    String? phoneNumber,
    String? userId,
    String? role,
    bool? isActive,
    String? displayName,
    String? preferredLanguage,
    DateTime? lastInteractionAt,
    String? leagueId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return WhatsAppLinkEntity(
      id: id ?? this.id,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      userId: userId ?? this.userId,
      role: role ?? this.role,
      isActive: isActive ?? this.isActive,
      displayName: displayName ?? this.displayName,
      preferredLanguage: preferredLanguage ?? this.preferredLanguage,
      lastInteractionAt: lastInteractionAt ?? this.lastInteractionAt,
      leagueId: leagueId ?? this.leagueId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Validate phone number format (international with +)
  static bool isValidPhoneNumber(String phone) {
    return RegExp(r'^\+\d{10,15}$').hasMatch(phone);
  }

  /// Get formatted phone number for display
  String get formattedPhone {
    if (phoneNumber.startsWith('+52') && phoneNumber.length >= 12) {
      final number = phoneNumber.substring(3);
      if (number.length == 10) {
        return '+52 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}';
      }
    }
    return phoneNumber;
  }

  /// Get initials from display name
  String get initials {
    if (displayName == null || displayName!.isEmpty) return '?';
    final parts = displayName!.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return displayName![0].toUpperCase();
  }

  /// Role display in Spanish
  String get roleDisplay {
    final roleMap = {
      'league_admin': 'Admin Liga',
      'team_owner': 'Dueño Equipo',
      'super_admin': 'Super Admin',
      'public': 'Público',
    };
    return roleMap[role] ?? role ?? 'Sin rol';
  }

  /// Status text in Spanish
  String get statusText => isActive ? 'Activo' : 'Inactivo';

  /// Check if link has a display name
  bool get hasDisplayName => displayName != null && displayName!.isNotEmpty;
}
