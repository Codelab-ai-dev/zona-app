import 'package:equatable/equatable.dart';
import '../../../domain/entities/attendance_entity.dart';

abstract class AttendanceEvent extends Equatable {
  const AttendanceEvent();

  @override
  List<Object?> get props => [];
}

/// Scan a QR code and parse player data
class ScanQRCodeEvent extends AttendanceEvent {
  final String qrData;

  const ScanQRCodeEvent({required this.qrData});

  @override
  List<Object?> get props => [qrData];
}

/// Register attendance for a scanned player
class RegisterAttendanceEvent extends AttendanceEvent {
  final QRPlayerData playerData;
  final String? matchId;
  final String scannedByUserId;

  const RegisterAttendanceEvent({
    required this.playerData,
    this.matchId,
    required this.scannedByUserId,
  });

  @override
  List<Object?> get props => [playerData, matchId, scannedByUserId];
}

/// Check if player already has attendance for a match
class CheckAttendanceEvent extends AttendanceEvent {
  final String playerId;
  final String? matchId;

  const CheckAttendanceEvent({
    required this.playerId,
    this.matchId,
  });

  @override
  List<Object?> get props => [playerId, matchId];
}

/// Load all attendance records for a match
class LoadMatchAttendanceEvent extends AttendanceEvent {
  final String matchId;

  const LoadMatchAttendanceEvent({required this.matchId});

  @override
  List<Object?> get props => [matchId];
}

/// Reset scanner state for next scan
class ResetScannerEvent extends AttendanceEvent {
  const ResetScannerEvent();
}
