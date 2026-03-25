import 'dart:convert';
import '../../domain/entities/attendance_entity.dart';

/// QR Code parsing service
/// Ported from Zona-G with keyboard layout normalization
class QRService {
  static final RegExp _namePattern =
      RegExp(r'player_name[^A-Z]*([A-Z][A-Z\s]+[A-Z])');
  static final RegExp _jerseyPattern =
      RegExp(r'jersey_number[3":\s]*(\d+)');
  static final RegExp _uuidPattern =
      RegExp(r'[a-f0-9\-]{20,40}', caseSensitive: false);
  static final RegExp _cleanUuidPattern = RegExp(r'[^a-fA-F0-9\-]');

  /// Spanish keyboard layout translation
  static const Map<String, String> _spanishLayout = {
    '.': ':', 'm': ',', '8': '_', '#': '-', '\u00b7': '-',
    'q': 'a', 'Q': 'A', '\u00f1': 'm', '\u00d1': 'M', 'w': 'z', 'W': 'Z',
    ';': '0', '!': '1', '\$': '4',
    '%': '5', '&': '6', '\'': '7', '(': '8', ')': '9', '=': '0',
    '\u00a1': '1', '\u00bf': '/', '\u00e7': ',', '\u00b4': '\'', '`': '\'',
    '+': '}', '\u00a8': '{', '\u00ba': '`', '\u00aa': '~',
  };

  /// German keyboard layout translation
  static const Map<String, String> _germanLayout = {
    '@': '"', '>': ':', '?': '_', '/': '-', 'z': 'y', 'Z': 'Y',
  };

  /// Parse QR code data into QRPlayerData
  static QRPlayerData? parseQRCode(String qrData) {
    // Attempt 1: Direct JSON
    try {
      return _fromJson(json.decode(qrData) as Map<String, dynamic>);
    } catch (_) {}

    // Attempt 2: Normalize keyboard layout
    final normalized = _normalizeKeyboardLayout(qrData);
    if (normalized != qrData) {
      try {
        return _fromJson(json.decode(normalized) as Map<String, dynamic>);
      } catch (_) {}
    }

    // Attempt 3: Legacy pipe format
    return _parseLegacyFormat(qrData);
  }

  static QRPlayerData? _fromJson(Map<String, dynamic> json) {
    final playerId =
        (json['player_id'] ?? json['playerId'] ?? '') as String;
    final playerName =
        (json['player_name'] ?? json['playerName'] ?? '') as String;
    final teamId = (json['team_id'] ?? json['teamId'] ?? '') as String;
    final jerseyNumber =
        (json['jersey_number'] ?? json['jerseyNumber'] ?? 0) as int;
    final leagueId =
        (json['league_id'] ?? json['leagueId']) as String?;

    if (playerId.isEmpty || playerName.isEmpty || teamId.isEmpty) {
      return null;
    }

    return QRPlayerData(
      playerId: playerId,
      playerName: playerName,
      teamId: teamId,
      jerseyNumber: jerseyNumber,
      leagueId: leagueId,
    );
  }

  static String _normalizeKeyboardLayout(String qrData) {
    if (qrData.startsWith('{')) return qrData;

    final layout = _detectLayout(qrData);
    if (layout > 0) {
      final extracted = _extractPlayerDataFromCorrupted(qrData, layout);
      if (extracted != null) return extracted;
    }
    return qrData;
  }

  static int _detectLayout(String data) {
    if (data.contains('@tzpe@') ||
        data.contains('@plazer') ||
        data.contains('plazer?')) {
      return 2; // German
    }
    if (data.contains('3type3') || data.contains('3plqyer')) {
      return 1; // Spanish
    }
    return 0;
  }

  static String _translateChars(String data, int layout) {
    final map = layout == 2 ? _germanLayout : _spanishLayout;
    final buffer = StringBuffer();
    for (int i = 0; i < data.length; i++) {
      final char = data[i];
      buffer.write(map[char] ?? char);
    }
    return buffer.toString();
  }

  static String? _extractPlayerDataFromCorrupted(String data,
      [int layout = 1]) {
    try {
      final normalized = _translateChars(data, layout);

      String? playerName;
      final nameMatch = _namePattern.firstMatch(normalized);
      if (nameMatch != null) {
        playerName = nameMatch.group(1)?.trim();
      } else {
        final altMatch = RegExp(r'player_name["\s:>]*([A-Z][A-Za-z\s]+)')
            .firstMatch(normalized);
        playerName = altMatch?.group(1)?.trim();
      }
      if (playerName == null || playerName.isEmpty) return null;

      final jerseyMatch = _jerseyPattern.firstMatch(normalized);
      final jerseyNumber =
          int.tryParse(jerseyMatch?.group(1) ?? '') ?? 0;

      final uuidMatches = RegExp(
              r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}',
              caseSensitive: false)
          .allMatches(normalized)
          .map((m) => m.group(0) ?? '')
          .toList();

      List<String> uuids = uuidMatches;
      if (uuids.isEmpty) {
        uuids = _uuidPattern
            .allMatches(normalized)
            .map((m) => m.group(0)!.replaceAll(_cleanUuidPattern, ''))
            .where((s) => s.length >= 32)
            .toList();
      }

      return json.encode({
        'type': 'player_verification',
        'player_id': uuids.isNotEmpty ? uuids[0] : '',
        'player_name': playerName,
        'team_id': uuids.length > 1 ? uuids[1] : '',
        'jersey_number': jerseyNumber,
        if (uuids.length > 2) 'league_id': uuids[2],
        'version': '1.0',
      });
    } catch (_) {
      return null;
    }
  }

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

  /// Generate QR data JSON from player data
  static String generateQRData(QRPlayerData data) {
    return json.encode({
      'type': 'player_verification',
      'player_id': data.playerId,
      'player_name': data.playerName,
      'team_id': data.teamId,
      'jersey_number': data.jerseyNumber,
      if (data.leagueId != null) 'league_id': data.leagueId,
      'version': '1.0',
    });
  }

  /// Validate QR data
  static bool isValidQRData(String qrData) {
    final parsed = parseQRCode(qrData);
    return parsed != null &&
        parsed.playerId.isNotEmpty &&
        parsed.playerName.isNotEmpty &&
        parsed.teamId.isNotEmpty;
  }
}
