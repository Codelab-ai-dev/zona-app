import 'dart:convert';
import 'dart:io';

import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/failure_mapper.dart';
import '../../core/network/json.dart';
import '../../domain/entities/attendance_entity.dart';
import '../../domain/repositories/attendance_repository.dart';
import '../mappers/attendance_mapper.dart';

/// QR attendance backed by the Zona Gol API
/// (`/players/{id}/today-matches`, `/matches/{id}/attendance/qr`).
class AttendanceRepositoryImpl implements AttendanceRepository {
  final ApiClient api;

  AttendanceRepositoryImpl({required this.api});

  @override
  Future<Either<Failure, List<TodayMatchEntity>>> getTodayMatches(
    String playerId,
    DateTime date,
  ) async {
    try {
      // Not paginated: every match of that day comes in one response.
      final rows = await api.getList(
        '/players/$playerId/today-matches',
        query: {'date': apiDate(date)},
      );
      return Right(rows.map(AttendanceMapper.todayMatchFromJson).toList());
    } catch (e) {
      return Left(failureFrom(e, 'Error al buscar los partidos del jugador'));
    }
  }

  @override
  Future<Either<Failure, AttendanceResult>> registerAttendance({
    required String playerId,
    required String matchId,
  }) async {
    try {
      await api.post('/matches/$matchId/attendance/qr', {
        'player_id': playerId,
        'recognition_mode': 'quick',
        'confidence_score': 1,
        'similarity_score': 1,
        // Stored as jsonb, so it must be a JSON document.
        'device_info': jsonEncode({
          'platform': Platform.operatingSystem,
          'scan_method': 'qr_camera',
        }),
        'local_timestamp': _rfc3339(DateTime.now()),
      });
      return const Right(AttendanceResult.registered);
    } on ApiException catch (e) {
      if (e.isConflict) return const Right(AttendanceResult.alreadyRegistered);
      return Left(failureFrom(e));
    } catch (e) {
      return Left(failureFrom(e, 'Error al registrar asistencia'));
    }
  }

  /// RFC 3339 with the device's UTC offset (e.g. `2026-11-12T16:05:00-06:00`).
  static String _rfc3339(DateTime t) {
    String two(int n) => n.toString().padLeft(2, '0');
    final local = t.toLocal();
    final offset = local.timeZoneOffset;
    final sign = offset.isNegative ? '-' : '+';
    final abs = offset.abs();
    final base = '${apiDate(local)}T${two(local.hour)}:${two(local.minute)}:${two(local.second)}';
    return '$base$sign${two(abs.inHours)}:${two(abs.inMinutes % 60)}';
  }
}
