import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/attendance_entity.dart';

/// Attendance Repository
/// Defines the contract for QR attendance operations
abstract class AttendanceRepository {
  /// Register a player attendance (QR check-in)
  Future<Either<Failure, AttendanceEntity>> registerAttendance({
    required String playerId,
    required String teamId,
    String? matchId,
    required String scannedByUserId,
    String recognitionMode = 'quick',
  });

  /// Check if player has attendance for a specific match
  Future<Either<Failure, bool>> hasAttendanceForMatch(
    String playerId,
    String matchId,
  );

  /// Check if player has any attendance today
  Future<Either<Failure, bool>> hasAttendanceToday(String playerId);

  /// Get all attendance records for a match (with player names)
  Future<Either<Failure, List<AttendanceEntity>>> getMatchAttendance(
    String matchId,
  );

  /// Get attendance history for a player
  Future<Either<Failure, List<AttendanceEntity>>> getPlayerAttendance(
    String playerId, {
    int limit = 20,
  });
}
