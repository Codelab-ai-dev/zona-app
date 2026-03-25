import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/attendance_entity.dart';
import '../repositories/attendance_repository.dart';

class GetMatchAttendanceUseCase {
  final AttendanceRepository repository;

  GetMatchAttendanceUseCase(this.repository);

  Future<Either<Failure, List<AttendanceEntity>>> call(String matchId) {
    return repository.getMatchAttendance(matchId);
  }
}
