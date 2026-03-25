import 'dart:convert';
import 'dart:io';

import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/errors/failures.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/attendance_entity.dart';
import '../../domain/repositories/attendance_repository.dart';
import '../datasources/remote/supabase_client.dart';
import '../mappers/attendance_mapper.dart';

/// Attendance Repository Implementation
/// Manages asistencias_qr table with Supabase
class AttendanceRepositoryImpl implements AttendanceRepository {
  final SupabaseClientService supabaseService;
  final NetworkInfo networkInfo;

  AttendanceRepositoryImpl({
    required this.supabaseService,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, AttendanceEntity>> registerAttendance({
    required String playerId,
    required String teamId,
    String? matchId,
    required String scannedByUserId,
    String recognitionMode = 'quick',
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final now = DateTime.now();
      final deviceInfo = json.encode({
        'platform': Platform.isAndroid ? 'android' : 'ios',
        'scan_method': 'qr_camera',
        'timestamp': now.toIso8601String(),
      });

      final response = await supabaseService.client
          .from('asistencias_qr')
          .insert({
            'player_id': playerId,
            'team_id': teamId,
            'match_id': matchId,
            'checked_in_at': now.toIso8601String(),
            'recognition_mode': recognitionMode,
            'device_info': deviceInfo,
            'scanned_by_user_id': scannedByUserId,
          })
          .select('''
            *, players(name, jersey_number)
          ''')
          .single();

      return Right(AttendanceMapper.fromRow(response));
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al registrar asistencia: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, bool>> hasAttendanceForMatch(
    String playerId,
    String matchId,
  ) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('asistencias_qr')
          .select('id')
          .eq('player_id', playerId)
          .eq('match_id', matchId)
          .maybeSingle();

      return Right(response != null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al verificar asistencia: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, bool>> hasAttendanceToday(String playerId) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final now = DateTime.now();
      final startOfDay = DateTime(now.year, now.month, now.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      final response = await supabaseService.client
          .from('asistencias_qr')
          .select('id')
          .eq('player_id', playerId)
          .gte('created_at', startOfDay.toIso8601String())
          .lt('created_at', endOfDay.toIso8601String())
          .maybeSingle();

      return Right(response != null);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al verificar asistencia: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<AttendanceEntity>>> getMatchAttendance(
    String matchId,
  ) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('asistencias_qr')
          .select('''
            *, players(name, jersey_number)
          ''')
          .eq('match_id', matchId)
          .order('checked_in_at', ascending: true);

      final rows = response as List;
      final attendance = rows
          .map((row) => AttendanceMapper.fromRow(row as Map<String, dynamic>))
          .toList();

      return Right(attendance);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al obtener asistencia: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<AttendanceEntity>>> getPlayerAttendance(
    String playerId, {
    int limit = 20,
  }) async {
    try {
      final isConnected = await networkInfo.isConnected;
      if (!isConnected) {
        return Left(NetworkFailure('No internet connection'));
      }

      final response = await supabaseService.client
          .from('asistencias_qr')
          .select('*')
          .eq('player_id', playerId)
          .order('created_at', ascending: false)
          .limit(limit);

      final rows = response as List;
      final attendance = rows
          .map((row) => AttendanceMapper.fromRow(row as Map<String, dynamic>))
          .toList();

      return Right(attendance);
    } on PostgrestException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(
          ServerFailure('Error al obtener historial: ${e.toString()}'));
    }
  }
}
