import 'package:equatable/equatable.dart';

/// WhatsApp Link Entity
/// A phone number linked to the league's WhatsApp assistant.
/// The API stores the number as digits only (E.164 without "+", e.g. 5215512345678).
class WhatsAppLinkEntity extends Equatable {
  final String id;
  final String phoneNumber;
  final String? userId;
  final String? leagueId;
  final String? tournamentId;
  final String? role;
  final bool isActive;
  final DateTime? linkedAt;
  final DateTime? lastInteractionAt;
  final String? displayName;
  final String preferredLanguage;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const WhatsAppLinkEntity({
    required this.id,
    required this.phoneNumber,
    this.userId,
    this.leagueId,
    this.tournamentId,
    this.role,
    this.isActive = true,
    this.linkedAt,
    this.lastInteractionAt,
    this.displayName,
    this.preferredLanguage = 'es',
    this.createdAt,
    this.updatedAt,
  });

  @override
  List<Object?> get props => [
    id,
    phoneNumber,
    userId,
    leagueId,
    tournamentId,
    role,
    isActive,
    linkedAt,
    lastInteractionAt,
    displayName,
    preferredLanguage,
    createdAt,
    updatedAt,
  ];

  /// Roles the API accepts for a link.
  static const roles = ['league_admin', 'team_owner', 'user'];

  /// Digits only, as the API stores it ("+52 55 1234 5678" -> "525512345678").
  static String normalizePhone(String phone) =>
      phone.replaceAll(RegExp(r'\D'), '');

  /// 10 to 15 digits (an optional leading "+" and separators are ignored).
  static bool isValidPhoneNumber(String phone) =>
      RegExp(r'^\d{10,15}$').hasMatch(normalizePhone(phone));

  /// Get formatted phone number for display
  String get formattedPhone {
    final digits = normalizePhone(phoneNumber);
    if (digits.startsWith('52') && digits.length == 12) {
      final n = digits.substring(2);
      return '+52 ${n.substring(0, 3)} ${n.substring(3, 6)} ${n.substring(6)}';
    }
    return '+$digits';
  }

  /// The national part of a Mexican number (without the 52 country code).
  String get localPhone {
    final digits = normalizePhone(phoneNumber);
    return digits.startsWith('52') && digits.length == 12
        ? digits.substring(2)
        : digits;
  }

  /// Get initials from display name
  String get initials {
    if (displayName == null || displayName!.trim().isEmpty) return '?';
    final parts = displayName!.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  /// Role display in Spanish
  String get roleDisplay {
    const roleMap = {
      'league_admin': 'Admin Liga',
      'team_owner': 'Dueño Equipo',
      'super_admin': 'Super Admin',
      'user': 'Usuario',
    };
    return roleMap[role] ?? role ?? 'Sin rol';
  }

  /// Status text in Spanish
  String get statusText => isActive ? 'Activo' : 'Inactivo';

  /// Check if link has a display name
  bool get hasDisplayName => displayName != null && displayName!.isNotEmpty;
}
