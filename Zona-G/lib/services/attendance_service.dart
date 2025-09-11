import 'dart:io';
import 'package:flutter/services.dart';
import '../models/attendance.dart';
import '../config/supabase_config.dart';

class AttendanceService {
  
  // Register attendance for a player
  static Future<bool> registerAttendance({
    required String playerId,
    String? matchId,
    RecognitionMode recognitionMode = RecognitionMode.quick,
  }) async {
    try {
      print('📝 Registrando asistencia para jugador: $playerId');
      
      // If no matchId provided, get the first available match or create a default one
      String finalMatchId = matchId ?? await _getDefaultMatchId();
      
      // Get device info
      final deviceInfo = await _getDeviceInfo();
      
      // Create attendance record
      final attendance = Attendance.newRecord(
        playerId: playerId,
        matchId: finalMatchId,
        recognitionMode: recognitionMode,
        deviceInfo: deviceInfo,
      );

      // Insert to database
      final response = await SupabaseConfig.client
          .from('asistencias_qr')
          .insert(attendance.toJson())
          .select()
          .single();

      print('✅ Asistencia registrada exitosamente: ${response['id']}');
      return true;
    } catch (e) {
      print('❌ Error registrando asistencia: $e');
      return false;
    }
  }

  // Get a default match ID if none is provided
  static Future<String> _getDefaultMatchId() async {
    try {
      // Try to get the most recent scheduled or in-progress match
      final response = await SupabaseConfig.client
          .from('matches')
          .select('id')
          .inFilter('status', ['scheduled', 'in_progress'])
          .order('match_date', ascending: false)
          .limit(1);

      if (response.isNotEmpty) {
        return response.first['id'];
      } else {
        // If no matches found, get any match
        final fallbackResponse = await SupabaseConfig.client
            .from('matches')
            .select('id')
            .limit(1);
        
        if (fallbackResponse.isNotEmpty) {
          return fallbackResponse.first['id'];
        } else {
          throw Exception('No matches found in database');
        }
      }
    } catch (e) {
      print('⚠️ Error obteniendo match por defecto: $e');
      // Return a UUID that might exist or create a general attendance record
      throw Exception('No se pudo obtener un partido para registrar la asistencia');
    }
  }

  // Check if player has already registered attendance today
  static Future<bool> hasAttendanceToday(String playerId) async {
    try {
      final today = DateTime.now();
      final startOfDay = DateTime(today.year, today.month, today.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      final response = await SupabaseConfig.client
          .from('asistencias_qr')
          .select('id')
          .eq('player_id', playerId)
          .gte('server_timestamp', startOfDay.toIso8601String())
          .lt('server_timestamp', endOfDay.toIso8601String())
          .limit(1);

      return response.isNotEmpty;
    } catch (e) {
      print('❌ Error verificando asistencia: $e');
      return false;
    }
  }

  // Check if player has already registered attendance for a specific match
  static Future<bool> hasAttendanceForMatch(String playerId, String matchId) async {
    try {
      final response = await SupabaseConfig.client
          .from('asistencias_qr')
          .select('id')
          .eq('player_id', playerId)
          .eq('match_id', matchId)
          .limit(1);

      return response.isNotEmpty;
    } catch (e) {
      print('❌ Error verificando asistencia del partido: $e');
      return false;
    }
  }

  // Get attendance records for a player
  static Future<List<Attendance>> getPlayerAttendance(String playerId, {int limit = 10}) async {
    try {
      final response = await SupabaseConfig.client
          .from('asistencias_qr')
          .select()
          .eq('player_id', playerId)
          .order('server_timestamp', ascending: false)
          .limit(limit);

      return response
          .map<Attendance>((data) => Attendance.fromJson(data))
          .toList();
    } catch (e) {
      print('❌ Error obteniendo asistencias: $e');
      return [];
    }
  }

  // Get attendance records for a specific match
  static Future<List<Attendance>> getMatchAttendance(String matchId) async {
    try {
      final response = await SupabaseConfig.client
          .from('asistencias_qr')
          .select('''
            *,
            players(id, name, jersey_number)
          ''')
          .eq('match_id', matchId)
          .order('server_timestamp', ascending: false);

      return response
          .map<Attendance>((data) => Attendance.fromJson(data))
          .toList();
    } catch (e) {
      print('❌ Error obteniendo asistencias del partido: $e');
      return [];
    }
  }

  // Get device information
  static Future<Map<String, dynamic>> _getDeviceInfo() async {
    try {
      final deviceInfo = <String, dynamic>{};
      
      // Get platform info
      if (Platform.isAndroid) {
        deviceInfo['platform'] = 'android';
        deviceInfo['device'] = 'mobile';
      } else if (Platform.isIOS) {
        deviceInfo['platform'] = 'ios';
        deviceInfo['device'] = 'mobile';
      } else {
        deviceInfo['platform'] = 'unknown';
        deviceInfo['device'] = 'unknown';
      }

      deviceInfo['app_version'] = '1.0.0';
      deviceInfo['scan_method'] = 'qr_code';
      deviceInfo['timestamp'] = DateTime.now().toIso8601String();

      return deviceInfo;
    } catch (e) {
      print('⚠️ Error obteniendo info del dispositivo: $e');
      return {
        'platform': 'flutter',
        'device': 'mobile',
        'app_version': '1.0.0',
        'scan_method': 'qr_code',
      };
    }
  }

  // Get attendance statistics for a player
  static Future<Map<String, dynamic>> getPlayerAttendanceStats(String playerId) async {
    try {
      final response = await SupabaseConfig.client
          .rpc('get_player_attendance_stats', params: {'player_uuid': playerId});
      
      return response ?? {
        'total_attendances': 0,
        'this_month': 0,
        'this_week': 0,
        'streak': 0,
      };
    } catch (e) {
      print('❌ Error obteniendo estadísticas: $e');
      // Return default stats if function doesn't exist
      final attendances = await getPlayerAttendance(playerId, limit: 100);
      final now = DateTime.now();
      final thisMonth = attendances.where((a) => 
          a.serverTimestamp != null &&
          a.serverTimestamp!.year == now.year &&
          a.serverTimestamp!.month == now.month
      ).length;
      
      final weekAgo = now.subtract(const Duration(days: 7));
      final thisWeek = attendances.where((a) => 
          a.serverTimestamp != null &&
          a.serverTimestamp!.isAfter(weekAgo)
      ).length;

      return {
        'total_attendances': attendances.length,
        'this_month': thisMonth,
        'this_week': thisWeek,
        'streak': 0,
      };
    }
  }
}