import '../../domain/entities/attendance_entity.dart';
import '../models/attendance_model.dart';

/// Maps between AttendanceModel / DB rows and AttendanceEntity
class AttendanceMapper {
  /// Convert a DB row (with joined player data) to AttendanceEntity
  static AttendanceEntity fromRow(Map<String, dynamic> row) {
    final player = row['players'] as Map<String, dynamic>?;

    return AttendanceEntity(
      id: row['id'] as String,
      playerId: row['player_id'] as String,
      matchId: row['match_id'] as String?,
      teamId: row['team_id'] as String? ?? '',
      checkedInAt: row['checked_in_at'] != null
          ? DateTime.parse(row['checked_in_at'] as String)
          : DateTime.now(),
      recognitionMode: row['recognition_mode'] as String? ?? 'quick',
      deviceInfo: row['device_info'] is String
          ? row['device_info'] as String
          : null,
      scannedByUserId: row['scanned_by_user_id'] as String?,
      serverTimestamp: row['server_timestamp'] != null
          ? DateTime.tryParse(row['server_timestamp'] as String)
          : null,
      createdAt: row['created_at'] != null
          ? DateTime.tryParse(row['created_at'] as String)
          : null,
      playerName: player?['name'] as String?,
      jerseyNumber: player?['jersey_number'] as int?,
    );
  }

  /// Convert AttendanceModel to AttendanceEntity
  static AttendanceEntity toEntity(AttendanceModel model) {
    return AttendanceEntity(
      id: model.id,
      playerId: model.playerId,
      matchId: model.matchId,
      teamId: model.teamId,
      checkedInAt: model.checkedInAt,
      recognitionMode: model.recognitionMode,
      deviceInfo: model.deviceInfo,
      scannedByUserId: model.scannedByUserId,
      serverTimestamp: model.serverTimestamp,
      createdAt: model.createdAt,
    );
  }
}
