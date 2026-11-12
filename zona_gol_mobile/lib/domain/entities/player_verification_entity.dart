import 'package:equatable/equatable.dart';

/// Identity document review status of a player.
enum VerificationStatus {
  /// Document uploaded, not reviewed yet.
  pending,

  /// Reviewed and verified.
  verified,

  /// Nothing uploaded.
  noDocument;

  static VerificationStatus parse(String? value) {
    switch (value) {
      case 'verified':
        return VerificationStatus.verified;
      case 'pending':
        return VerificationStatus.pending;
      default:
        return VerificationStatus.noDocument;
    }
  }
}

/// A player in the league's verification queue
/// (`GET /leagues/{id}/players/verification`).
class PlayerVerificationEntity extends Equatable {
  final String playerId;
  final String name;
  final int jerseyNumber;
  final String position;
  final DateTime? birthDate;
  final String teamId;
  final String teamName;
  final VerificationStatus status;

  /// Private storage key of the document (scope player_document). It is not
  /// a URL: ask the server for a short-lived link to view it.
  final String? documentKey;
  final DateTime? verifiedAt;

  const PlayerVerificationEntity({
    required this.playerId,
    required this.name,
    required this.jerseyNumber,
    required this.position,
    this.birthDate,
    required this.teamId,
    required this.teamName,
    required this.status,
    this.documentKey,
    this.verifiedAt,
  });

  bool get isVerified => status == VerificationStatus.verified;
  bool get hasDocument => documentKey != null && documentKey!.isNotEmpty;

  String get displayName => '#$jerseyNumber $name';

  String get initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  /// Documents uploaded as PDF cannot be shown inline.
  bool get isPdf => documentKey?.toLowerCase().endsWith('.pdf') ?? false;

  @override
  List<Object?> get props =>
      [playerId, name, jerseyNumber, position, birthDate, teamId, teamName, status, documentKey, verifiedAt];
}

/// League counters (`GET /leagues/{id}/players/verification/summary`).
class VerificationSummaryEntity extends Equatable {
  final int total;
  final int pending;
  final int verified;
  final int noDocument;

  const VerificationSummaryEntity({
    this.total = 0,
    this.pending = 0,
    this.verified = 0,
    this.noDocument = 0,
  });

  @override
  List<Object?> get props => [total, pending, verified, noDocument];
}
