import 'package:freezed_annotation/freezed_annotation.dart';

part 'attendance_model.freezed.dart';
part 'attendance_model.g.dart';

@freezed
class AttendanceModel with _$AttendanceModel {
  const AttendanceModel._();

  const factory AttendanceModel({
    required String id,
    @JsonKey(name: 'match_id') required String matchId,
    @JsonKey(name: 'player_id') required String playerId,
    @JsonKey(name: 'team_id') required String teamId,
    @JsonKey(name: 'checked_in_at') required DateTime checkedInAt,
    @JsonKey(name: 'recognition_mode') @Default('quick') String recognitionMode, // 'quick' or 'thorough'
    @JsonKey(name: 'device_info') String? deviceInfo,
    @JsonKey(name: 'scanned_by_user_id') String? scannedByUserId,
    @JsonKey(name: 'server_timestamp') DateTime? serverTimestamp,
    @JsonKey(name: 'created_at') DateTime? createdAt,
  }) = _AttendanceModel;

  factory AttendanceModel.fromJson(Map<String, dynamic> json) =>
      _$AttendanceModelFromJson(json);

  // Helper methods
  bool get isQuickMode => recognitionMode == 'quick';
  bool get isThoroughMode => recognitionMode == 'thorough';

  String get recognitionModeDisplay {
    switch (recognitionMode) {
      case 'quick':
        return 'Rápido';
      case 'thorough':
        return 'Completo';
      default:
        return recognitionMode;
    }
  }

  bool get hasDeviceInfo => deviceInfo != null && deviceInfo!.isNotEmpty;
  bool get hasScannedBy => scannedByUserId != null;

  // Time helpers
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

  Duration? get timeSinceCheckIn {
    final now = DateTime.now();
    return now.difference(checkedInAt);
  }

  String get timeSinceCheckInDisplay {
    final duration = timeSinceCheckIn;
    if (duration == null) return '';

    if (duration.inHours > 0) {
      return 'Hace ${duration.inHours}h';
    } else if (duration.inMinutes > 0) {
      return 'Hace ${duration.inMinutes}min';
    } else {
      return 'Hace unos segundos';
    }
  }

  // Sync status helpers
  bool get isSynced => serverTimestamp != null;
  bool get isPendingSync => serverTimestamp == null;
}
