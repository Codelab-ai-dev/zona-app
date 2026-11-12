import 'package:equatable/equatable.dart';
import '../../../domain/entities/attendance_entity.dart';

abstract class AttendanceEvent extends Equatable {
  const AttendanceEvent();

  @override
  List<Object?> get props => [];
}

/// A QR code was read: parse it and look up the player's matches today.
class ScanQRCodeEvent extends AttendanceEvent {
  final String qrData;

  const ScanQRCodeEvent({required this.qrData});

  @override
  List<Object?> get props => [qrData];
}

/// Look up (again) the scanned player's matches for today.
class LoadTodayMatchesEvent extends AttendanceEvent {
  final QRPlayerData playerData;

  const LoadTodayMatchesEvent({required this.playerData});

  @override
  List<Object?> get props => [playerData];
}

/// The operator picked one of several matches.
class SelectMatchEvent extends AttendanceEvent {
  final String matchId;

  const SelectMatchEvent({required this.matchId});

  @override
  List<Object?> get props => [matchId];
}

/// Register the scanned player's check-in for the selected match.
class RegisterAttendanceEvent extends AttendanceEvent {
  const RegisterAttendanceEvent();
}

/// Reset scanner state for next scan
class ResetScannerEvent extends AttendanceEvent {
  const ResetScannerEvent();
}
