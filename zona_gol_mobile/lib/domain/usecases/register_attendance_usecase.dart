import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../repositories/attendance_repository.dart';

class RegisterAttendanceParams extends Equatable {
  final String playerId;
  final String matchId;

  const RegisterAttendanceParams({
    required this.playerId,
    required this.matchId,
  });

  @override
  List<Object?> get props => [playerId, matchId];
}

class RegisterAttendanceUseCase {
  final AttendanceRepository repository;

  RegisterAttendanceUseCase(this.repository);

  Future<Either<Failure, AttendanceResult>> call(
      RegisterAttendanceParams params) {
    return repository.registerAttendance(
      playerId: params.playerId,
      matchId: params.matchId,
    );
  }
}
