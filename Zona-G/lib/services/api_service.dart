import 'dart:typed_data';
import '../models/player.dart';
import '../config/supabase_config.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3000'; // Change to your server URL
  
  // Get player by ID
  static Future<Player?> getPlayer(String playerId) async {
    try {
      print('🔍 Buscando jugador con ID: $playerId');
      
      final response = await SupabaseConfig.client
          .from('players')
          .select()
          .eq('id', playerId)
          .single();
      
      print('✅ Jugador encontrado: ${response['name']}');
      print('🖼️ URL de foto: ${response['photo'] ?? 'Sin foto'}');
      
      final player = Player.fromJson(response);
      
      // Si no hay foto directa, intentar generar URL desde storage
      if (player.photo == null || player.photo!.isEmpty) {
        print('⚠️ No hay foto directa, intentando obtener desde storage...');
        try {
          final photoUrl = _getPlayerPhotoUrl(playerId);
          if (photoUrl != null) {
            print('✅ URL de foto desde storage: $photoUrl');
            // Crear una copia del player con la foto actualizada
            response['photo'] = photoUrl;
            return Player.fromJson(response);
          } else {
            print('🔍 Listando archivos disponibles para debug...');
            await listPlayerFiles(playerId);
          }
        } catch (e) {
          print('❌ Error obteniendo foto desde storage: $e');
        }
      }
      
      return player;
    } catch (e) {
      print('❌ Error fetching player: $e');
      print('🔍 Player ID buscado: $playerId');
      
      // Try to search by approximate match or different format
      try {
        print('🔄 Intentando búsqueda alternativa...');
        final allPlayers = await SupabaseConfig.client
            .from('players')
            .select();
        
        print('📊 Total jugadores en BD: ${allPlayers.length}');
        if (allPlayers.isNotEmpty) {
          print('🎯 Primer jugador ejemplo: ID=${allPlayers[0]['id']}, Name=${allPlayers[0]['name']}');
        }
      } catch (e2) {
        print('❌ Error en búsqueda alternativa: $e2');
      }
      
      return null;
    }
  }

  // Upload photo for player
  static Future<bool> uploadPlayerPhoto(String playerId, Uint8List imageBytes, String fileName) async {
    try {
      // Upload to Supabase Storage
      final path = 'players/$playerId/$fileName';
      await SupabaseConfig.client.storage
          .from('player-photos')
          .uploadBinary(path, imageBytes);

      // Get public URL
      final publicUrl = SupabaseConfig.client.storage
          .from('player-photos')
          .getPublicUrl(path);

      // Update player photo in database
      await SupabaseConfig.client
          .from('players')
          .update({'photo': publicUrl})
          .eq('id', playerId);

      return true;
    } catch (e) {
      print('Error uploading photo: $e');
      return false;
    }
  }

  // Update player data
  static Future<bool> updatePlayer(String playerId, Map<String, dynamic> updates) async {
    try {
      await SupabaseConfig.client
          .from('players')
          .update(updates)
          .eq('id', playerId);
      return true;
    } catch (e) {
      print('Error updating player: $e');
      return false;
    }
  }

  // Get all players for a team
  static Future<List<Player>> getTeamPlayers(String teamId) async {
    try {
      final response = await SupabaseConfig.client
          .from('players')
          .select()
          .eq('team_id', teamId)
          .eq('is_active', true);
      
      return response.map<Player>((data) => Player.fromJson(data)).toList();
    } catch (e) {
      print('Error fetching team players: $e');
      return [];
    }
  }

  // Helper method to get player photo URL from storage
  static String? _getPlayerPhotoUrl(String playerId) {
    try {
      // Try common file extensions and paths
      final List<String> possiblePaths = [
        'players/$playerId/photo.jpg',
        'players/$playerId/photo.png',
        'players/$playerId/photo.jpeg',
        'player-photos/$playerId/photo.jpg',
        'player-photos/$playerId/photo.png',
        'player-photos/$playerId/photo.jpeg',
      ];
      
      for (String path in possiblePaths) {
        try {
          final url = SupabaseConfig.client.storage
              .from('player-photos')
              .getPublicUrl(path);
          
          if (url.isNotEmpty) {
            print('🎯 Intentando URL: $url');
            return url;
          }
        } catch (e) {
          // Continue to next path
          continue;
        }
      }
      
      return null;
    } catch (e) {
      print('❌ Error generating photo URL: $e');
      return null;
    }
  }

  // List all files for a player (for debugging)
  static Future<void> listPlayerFiles(String playerId) async {
    try {
      final files = await SupabaseConfig.client.storage
          .from('player-photos')
          .list(path: 'players/$playerId');
      
      print('📂 Archivos para jugador $playerId:');
      for (var file in files) {
        print('  - ${file.name} (${file.metadata})');
      }
    } catch (e) {
      print('❌ Error listando archivos: $e');
    }
  }

  // Get current active match (in progress or scheduled for today)
  static Future<String?> getCurrentMatchId() async {
    try {
      final today = DateTime.now();
      final startOfDay = DateTime(today.year, today.month, today.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));
      
      // First try to find matches in progress
      final inProgressMatches = await SupabaseConfig.client
          .from('matches')
          .select('id')
          .eq('status', 'in_progress')
          .limit(1);
      
      if (inProgressMatches.isNotEmpty) {
        return inProgressMatches.first['id'];
      }
      
      // Then try to find matches scheduled for today
      final todayMatches = await SupabaseConfig.client
          .from('matches')
          .select('id')
          .gte('match_date', startOfDay.toIso8601String())
          .lt('match_date', endOfDay.toIso8601String())
          .eq('status', 'scheduled')
          .order('match_date', ascending: true)
          .limit(1);
      
      if (todayMatches.isNotEmpty) {
        return todayMatches.first['id'];
      }
      
      return null;
    } catch (e) {
      print('❌ Error obteniendo partido actual: $e');
      return null;
    }
  }

  // Get current player statistics for a specific match
  static Future<Map<String, int>?> getCurrentPlayerStats({
    required String playerId,
    required String matchId,
  }) async {
    try {
      print('📊 Obteniendo estadísticas actuales para jugador $playerId en partido $matchId');
      
      final stats = await SupabaseConfig.client
          .from('player_stats')
          .select('goals, assists, yellow_cards, red_cards, minutes_played')
          .eq('player_id', playerId)
          .eq('match_id', matchId)
          .maybeSingle();
      
      if (stats != null) {
        return {
          'goals': stats['goals'] ?? 0,
          'assists': stats['assists'] ?? 0,
          'yellow_cards': stats['yellow_cards'] ?? 0,
          'red_cards': stats['red_cards'] ?? 0,
          'minutes_played': stats['minutes_played'] ?? 0,
        };
      } else {
        print('📊 No hay estadísticas existentes para este jugador/partido');
        return {
          'goals': 0,
          'assists': 0,
          'yellow_cards': 0,
          'red_cards': 0,
          'minutes_played': 0,
        };
      }
    } catch (e) {
      print('❌ Error obteniendo estadísticas actuales: $e');
      return null;
    }
  }

  // Update player statistics for a specific match
  static Future<bool> updatePlayerStats({
    required String playerId,
    required String matchId,
    required String statType,
    required int increment,
  }) async {
    try {
      print('📊 Actualizando estadística: $statType ${increment > 0 ? '+' : ''}$increment para jugador $playerId en partido $matchId');
      
      // First, check if player_stats record exists for this player and match
      final existingStats = await SupabaseConfig.client
          .from('player_stats')
          .select()
          .eq('player_id', playerId)
          .eq('match_id', matchId)
          .maybeSingle();
      
      if (existingStats != null) {
        // Update existing record
        final currentValue = existingStats[statType] ?? 0;
        final newValue = (currentValue + increment).clamp(0, double.infinity).toInt();
        
        await SupabaseConfig.client
            .from('player_stats')
            .update({
              statType: newValue,
              'updated_at': DateTime.now().toIso8601String(),
            })
            .eq('player_id', playerId)
            .eq('match_id', matchId);
        
        print('✅ Estadística actualizada: $statType = $newValue');
      } else {
        // Create new record
        final Map<String, dynamic> newStats = {
          'player_id': playerId,
          'match_id': matchId,
          'goals': 0,
          'assists': 0,
          'yellow_cards': 0,
          'red_cards': 0,
          'minutes_played': 90, // Default to full match
        };
        
        // Set the specific stat
        newStats[statType] = increment.clamp(0, double.infinity).toInt();
        
        await SupabaseConfig.client
            .from('player_stats')
            .insert(newStats);
        
        print('✅ Nuevo registro de estadísticas creado con $statType = ${newStats[statType]}');
      }
      
      return true;
    } catch (e) {
      print('❌ Error actualizando estadísticas: $e');
      return false;
    }
  }
}