import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/attendance_entity.dart';
import '../repositories/attendance_repository.dart';

class RegisterAttendanceParams extends Equatable {
  final String playerId;
  final String teamId;
  final String? matchId;
  final String scannedByUserId;

  const RegisterAttendanceParams({
    required this.playerId,
    required this.teamId,
    this.matchId,
    required this.scannedByUserId,
  });

  @override
  List<Object?> get props => [playerId, teamId, matchId, scannedByUserId];
}

class RegisterAttendanceUseCase {
  final AttendanceRepository repository;

  RegisterAttendanceUseCase(this.repository);

  Future<Either<Failure, AttendanceEntity>> call(
      RegisterAttendanceParams params) {
    return repository.registerAttendance(
      playerId: params.playerId,
      teamId: params.teamId,
      matchId: params.matchId,
      scannedByUserId: params.scannedByUserId,
    );
  }
}
