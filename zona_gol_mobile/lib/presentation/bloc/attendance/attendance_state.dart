import 'package:equatable/equatable.dart';
import '../../../domain/entities/attendance_entity.dart';

abstract class AttendanceState extends Equatable {
  const AttendanceState();

  @override
  List<Object?> get props => [];
}

class AttendanceInitial extends AttendanceState {}

/// QR code scanned, player data parsed — ready to register
class QRScanned extends AttendanceState {
  final QRPlayerData playerData;
  final bool? alreadyCheckedIn;

  const QRScanned({
    required this.playerData,
    this.alreadyCheckedIn,
  });

  @override
  List<Object?> get props => [playerData, alreadyCheckedIn];
}

/// QR code scan failed — invalid data
class QRScanError extends AttendanceState {
  final String message;

  const QRScanError({required this.message});

  @override
  List<Object?> get props => [message];
}

/// Registering attendance in progress
class AttendanceRegistering extends AttendanceState {}

/// Attendance registered successfully
class AttendanceRegistered extends AttendanceState {
  final AttendanceEntity attendance;

  const AttendanceRegistered({required this.attendance});

  @override
  List<Object?> get props => [attendance];
}

/// Attendance registration failed
class AttendanceRegisterError extends AttendanceState {
  final String message;

  const AttendanceRegisterError({required this.message});

  @override
  List<Object?> get props => [message];
}

/// Loading match attendance list
class MatchAttendanceLoading extends AttendanceState {}

/// Match attendance loaded
class MatchAttendanceLoaded extends AttendanceState {
  final List<AttendanceEntity> records;

  const MatchAttendanceLoaded({required this.records});

  @override
  List<Object?> get props => [records];
}

/// Error loading match attendance
class MatchAttendanceError extends AttendanceState {
  final String message;

  const MatchAttendanceError({required this.message});

  @override
  List<Object?> get props => [message];
}
