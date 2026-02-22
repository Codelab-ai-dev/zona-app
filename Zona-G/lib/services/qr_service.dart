import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/qr_data.dart';

class QRService {
  // Regex precompilados para mejor rendimiento
  static final RegExp _namePattern = RegExp(r'player_name[^A-Z]*([A-Z][A-Z\s]+[A-Z])');
  static final RegExp _jerseyPattern = RegExp(r'jersey_number[3":\s]*(\d+)');
  static final RegExp _uuidPattern = RegExp(r'[a-f0-9\-]{20,40}', caseSensitive: false);
  static final RegExp _cleanUuidPattern = RegExp(r'[^a-fA-F0-9\-]');

  /// Layout Español (patrón: 3type3)
  static const Map<String, String> _spanishLayout = {
    '.': ':', 'm': ',', '8': '_', '#': '-', '·': '-',
    'q': 'a', 'Q': 'A', 'ñ': 'm', 'Ñ': 'M', 'w': 'z', 'W': 'Z',
    ';': '0', '!': '1', '\$': '4',
    '%': '5', '&': '6', '\'': '7', '(': '8', ')': '9', '=': '0',
    '¡': '1', '¿': '/', 'ç': ',', '´': '\'', '`': '\'',
    '+': '}', '¨': '{', 'º': '`', 'ª': '~',
  };

  /// Layout Alemán/Otro (patrón: @tzpe@ o @plazer)
  static const Map<String, String> _germanLayout = {
    '@': '"',  // arroba → comilla
    '>': ':',  // mayor que → dos puntos
    '?': '_',  // interrogación → guión bajo
    '/': '-',  // slash → guión (UUIDs)
    'z': 'y',  // z ↔ y
    'Z': 'Y',
  };

  /// Detecta el tipo de layout corrupto
  static int _detectLayout(String data) {
    if (data.contains('@tzpe@') || data.contains('@plazer') || data.contains('plazer?')) {
      return 2; // German
    }
    if (data.contains('3type3') || data.contains('3plqyer')) {
      return 1; // Spanish
    }
    return 0; // Unknown
  }

  /// Normaliza datos de QR con layout de teclado incorrecto
  static String _normalizeKeyboardLayout(String qrData) {
    // Quick check - avoid processing if already valid JSON
    if (qrData.startsWith('{')) return qrData;

    final layout = _detectLayout(qrData);
    if (layout > 0) {
      final extracted = _extractPlayerDataFromCorrupted(qrData, layout);
      if (extracted != null) return extracted;
    }
    return qrData;
  }

  /// Traduce caracteres según el layout detectado
  static String _translateChars(String data, int layout) {
    final map = layout == 2 ? _germanLayout : _spanishLayout;
    final buffer = StringBuffer();
    for (int i = 0; i < data.length; i++) {
      final char = data[i];
      buffer.write(map[char] ?? char);
    }
    return buffer.toString();
  }

  /// Extrae datos del jugador del texto corrupto
  static String? _extractPlayerDataFromCorrupted(String data, [int layout = 1]) {
    try {
      // Traducir según el layout detectado
      final normalized = _translateChars(data, layout);

      // Extraer nombre - buscar patrón NOMBRE EN MAYÚSCULAS
      String? playerName;
      final nameMatch = _namePattern.firstMatch(normalized);
      if (nameMatch != null) {
        playerName = nameMatch.group(1)?.trim();
      } else {
        // Fallback: buscar después de player_name
        final altMatch = RegExp(r'player_name["\s:>]*([A-Z][A-Za-z\s]+)').firstMatch(normalized);
        playerName = altMatch?.group(1)?.trim();
      }

      if (playerName == null || playerName.isEmpty) return null;

      // Extraer jersey number
      final jerseyMatch = _jerseyPattern.firstMatch(normalized);
      final jerseyNumber = int.tryParse(jerseyMatch?.group(1) ?? '') ?? 0;

      // Extraer UUIDs (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      final uuidMatches = RegExp(r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', caseSensitive: false)
          .allMatches(normalized)
          .map((m) => m.group(0) ?? '')
          .toList();

      // Si no hay UUIDs completos, buscar parciales y limpiar
      List<String> uuids = uuidMatches;
      if (uuids.isEmpty) {
        uuids = _uuidPattern.allMatches(normalized)
            .map((m) => _cleanUuid(m.group(0) ?? ''))
            .where((s) => s.length >= 32)
            .toList();
      }

      final playerId = uuids.isNotEmpty ? uuids[0] : '';
      final teamId = uuids.length > 1 ? uuids[1] : '';
      final leagueId = uuids.length > 2 ? uuids[2] : null;


      return json.encode({
        'type': 'player_verification',
        'player_id': playerId,
        'player_name': playerName,
        'team_id': teamId,
        'jersey_number': jerseyNumber,
        if (leagueId != null) 'league_id': leagueId,
        'version': '1.0',
      });
    } catch (e) {
      debugPrint('❌ Error extrayendo datos: $e');
      return null;
    }
  }

  /// Limpia un UUID
  static String _cleanUuid(String uuid) {
    return uuid.replaceAll(_cleanUuidPattern, '');
  }

  // Parse QR code data
  static QRPlayerData? parseQRCode(String qrData) {
    // Intento 1: JSON directo
    try {
      return QRPlayerData.fromJson(json.decode(qrData));
    } catch (_) {}

    // Intento 2: Normalizar layout
    final normalizedData = _normalizeKeyboardLayout(qrData);
    if (normalizedData != qrData) {
      try {
        return QRPlayerData.fromJson(json.decode(normalizedData));
      } catch (_) {}
    }

    // Intento 3: Formato legacy
    return _parseLegacyFormat(qrData);
  }

  // Parse legacy format (pipe-separated values)
  static QRPlayerData? _parseLegacyFormat(String qrData) {
    try {
      final parts = qrData.split('|');
      if (parts.length >= 4) {
        return QRPlayerData(
          playerId: parts[0],
          playerName: parts[1],
          teamId: parts[2],
          jerseyNumber: int.tryParse(parts[3]) ?? 0,
          leagueId: parts.length > 4 ? parts[4] : null,
        );
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // Generate QR code data (JSON format)
  static String generateQRData(QRPlayerData playerData) {
    return json.encode(playerData.toJson());
  }

  // Validate QR data
  static bool isValidQRData(String qrData) {
    final parsed = parseQRCode(qrData);
    return parsed != null && 
           parsed.playerId.isNotEmpty && 
           parsed.playerName.isNotEmpty &&
           parsed.teamId.isNotEmpty;
  }
}