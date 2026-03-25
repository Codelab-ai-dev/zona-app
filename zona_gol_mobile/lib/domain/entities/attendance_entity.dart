import 'package:equatable/equatable.dart';

/// Attendance Entity
/// Represents a player attendance record (QR check-in)
class AttendanceEntity extends Equatable {
  final String id;
  final String playerId;
  final String? matchId;
  final String teamId;
  final DateTime checkedInAt;
  final String recognitionMode; // 'quick' or 'thorough'
  final String? deviceInfo;
  final String? scannedByUserId;
  final DateTime? serverTimestamp;
  final DateTime? createdAt;

  // Joined fields
  final String? playerName;
  final int? jerseyNumber;
  final String? teamName;

  const AttendanceEntity({
    required this.id,
    required this.playerId,
    this.matchId,
    required this.teamId,
    required this.checkedInAt,
    this.recognitionMode = 'quick',
    this.deviceInfo,
    this.scannedByUserId,
    this.serverTimestamp,
    this.createdAt,
    this.playerName,
    this.jerseyNumber,
    this.teamName,
  });

  @override
  List<Object?> get props => [
        id,
        playerId,
        matchId,
        teamId,
        checkedInAt,
        recognitionMode,
        scannedByUserId,
        createdAt,
        playerName,
        jerseyNumber,
        teamName,
      ];

  bool get isQuickMode => recognitionMode == 'quick';
  bool get isSynced => serverTimestamp != null;

  String get checkedInTimeDisplay {
    final hour = checkedInAt.hour.toString().padLeft(2, '0');
    final minute = checkedInAt.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  bool get isCheckedInToday {
    final now = DateTime.now();
    return checkedInAt.year == now.year &&
        checkedInAt.month == now.month &&
        checkedInAt.day == now.day;
  }

  String get displayName {
    if (playerName == null) return 'Jugador';
    if (jerseyNumber != null) return '#$jerseyNumber $playerName';
    return playerName!;
  }
}

/// QR Player Data — parsed from QR code
class QRPlayerData extends Equatable {
  final String playerId;
  final String playerName;
  final String teamId;
  final int jerseyNumber;
  final String? leagueId;

  const QRPlayerData({
    required this.playerId,
    required this.playerName,
    required this.teamId,
    required this.jerseyNumber,
    this.leagueId,
  });

  @override
  List<Object?> get props =>
      [playerId, playerName, teamId, jerseyNumber, leagueId];

  String get displayName {
    if (jerseyNumber > 0) return '#$jerseyNumber $playerName';
    return playerName;
  }
}
