import 'dart:convert';
import '../models/qr_data.dart';

class QRService {
  // Parse QR code data
  static QRPlayerData? parseQRCode(String qrData) {
    print('🔍 Parseando QR: $qrData');
    
    try {
      // Try to parse as JSON first
      final Map<String, dynamic> data = json.decode(qrData);
      print('✅ QR parseado como JSON: $data');
      final result = QRPlayerData.fromJson(data);
      print('✅ QRPlayerData creado: ${result.toString()}');
      return result;
    } catch (e) {
      print('⚠️ No es JSON válido, intentando formato legacy...');
      // If JSON parsing fails, try to parse as legacy format
      return _parseLegacyFormat(qrData);
    }
  }

  // Parse legacy format (pipe-separated values)
  static QRPlayerData? _parseLegacyFormat(String qrData) {
    try {
      print('🔄 Intentando formato legacy con separadores |');
      final parts = qrData.split('|');
      print('📋 Partes encontradas: $parts (total: ${parts.length})');
      
      if (parts.length >= 4) {
        final result = QRPlayerData(
          playerId: parts[0],
          playerName: parts[1],
          teamId: parts[2],
          jerseyNumber: int.tryParse(parts[3]) ?? 0,
          leagueId: parts.length > 4 ? parts[4] : null,
        );
        print('✅ QRPlayerData legacy creado: ${result.toString()}');
        return result;
      }
      print('❌ Formato legacy inválido: se necesitan al menos 4 partes');
      return null;
    } catch (e) {
      print('❌ Error parsing legacy QR format: $e');
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