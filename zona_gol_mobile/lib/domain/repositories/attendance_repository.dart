import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/attendance_entity.dart';

/// Result of a QR check-in.
enum AttendanceResult {
  /// The check-in was recorded now.
  registered,

  /// The player already had a check-in for that match (API 409).
  alreadyRegistered,
}

/// Attendance Repository
/// Defines the contract for QR attendance operations
abstract class AttendanceRepository {
  /// Matches of the player's team on [date] (the device's local calendar
  /// date) that can still take attendance.
  Future<Either<Failure, List<TodayMatchEntity>>> getTodayMatches(
    String playerId,
    DateTime date,
  );

  /// Register a player's QR check-in for a match.
  Future<Either<Failure, AttendanceResult>> registerAttendance({
    required String playerId,
    required String matchId,
  });
}
