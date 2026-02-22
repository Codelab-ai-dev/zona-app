import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import '../models/player.dart';
import '../config/supabase_config.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3000'; // Change to your server URL
  
  // Check if player is suspended for a match
  static Future<bool> isPlayerSuspended(String playerId, String? matchId) async {
    try {
      print('🔍 Verificando suspensión para jugador: $playerId');

      if (matchId == null) {
        // If no match context, check if player has any active suspension
        final response = await SupabaseConfig.client
            .from('player_suspensions')
            .select('id')
            .eq('player_id', playerId)
            .eq('status', 'active')
            .limit(1);

        final isSuspended = response.isNotEmpty;
        print(isSuspended ? '⛔ Jugador suspendido (sin contexto de partido)' : '✅ Jugador habilitado');
        return isSuspended;
      }

      // Get match details to check team and league
      final matchResponse = await SupabaseConfig.client
          .from('matches')
          .select('tournament_id, tournament:tournaments(league_id)')
          .eq('id', matchId)
          .single();

      // Check for active suspensions
      final suspensionResponse = await SupabaseConfig.client
          .from('player_suspensions')
          .select('id, matches_to_serve, matches_served, suspension_type, reason')
          .eq('player_id', playerId)
          .eq('status', 'active')
          .limit(1);

      if (suspensionResponse.isEmpty) {
        print('✅ Jugador habilitado - Sin suspensiones activas');
        return false;
      }

      final suspension = suspensionResponse.first;
      final matchesRemaining = suspension['matches_to_serve'] - suspension['matches_served'];

      if (matchesRemaining > 0) {
        print('⛔ Jugador suspendido - Partidos restantes: $matchesRemaining');
        print('   Tipo: ${suspension['suspension_type']}');
        print('   Motivo: ${suspension['reason']}');
        return true;
      }

      print('✅ Jugador habilitado - Suspensión cumplida');
      return false;
    } catch (e) {
      print('❌ Error verificando suspensión: $e');
      // En caso de error, asumimos que NO está suspendido para no bloquear innecesariamente
      return false;
    }
  }

  // Get suspension details for a player
  static Future<Map<String, dynamic>?> getPlayerSuspension(String playerId) async {
    try {
      final response = await SupabaseConfig.client
          .from('player_suspensions')
          .select('*')
          .eq('player_id', playerId)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

      return response;
    } catch (e) {
      print('❌ Error obteniendo detalles de suspensión: $e');
      return null;
    }
  }

  // Get player by ID, with optional fallback to name search
  static Future<Player?> getPlayer(String playerId, {String? playerName, int? jerseyNumber, String? teamId}) async {
    try {
      // Validate UUID format before querying
      final uuidRegex = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
      if (!uuidRegex.hasMatch(playerId)) {
        if (playerName != null && playerName.isNotEmpty) {
          return getPlayerByName(playerName, jerseyNumber: jerseyNumber, teamId: teamId);
        }
        return null;
      }

      final response = await SupabaseConfig.client
          .from('players')
          .select()
          .eq('id', playerId)
          .single();

      return Player.fromJson(response);
    } catch (e) {

      // Fallback to name search
      if (playerName != null && playerName.isNotEmpty) {
        return getPlayerByName(playerName, jerseyNumber: jerseyNumber, teamId: teamId);
      }
      return null;
    }
  }

  // Search player by name (single optimized query)
  static Future<Player?> getPlayerByName(String name, {int? jerseyNumber, String? teamId}) async {
    try {
      // Normalize and extract search words
      final normalizedName = _normalizeNameForSearch(name);
      final searchWords = normalizedName.split(' ').where((w) => w.length >= 3).toList();

      if (searchWords.isEmpty) return null;

      // Single query strategy: combine jersey number + name pattern
      final longestWord = searchWords.reduce((a, b) => a.length >= b.length ? a : b);

      List<dynamic> response;

      // If we have jersey number, prioritize that (most selective)
      if (jerseyNumber != null && jerseyNumber > 0) {
        response = await SupabaseConfig.client
            .from('players')
            .select()
            .eq('jersey_number', jerseyNumber)
            .ilike('name', '%$longestWord%')
            .limit(5);

        // If found with jersey + name, return immediately
        if (response.isNotEmpty) {
          return Player.fromJson(response.first);
        }

        // Fallback: just jersey number
        response = await SupabaseConfig.client
            .from('players')
            .select()
            .eq('jersey_number', jerseyNumber)
            .limit(10);

        if (response.isNotEmpty) {
          final match = _findBestMatch(response, normalizedName, jerseyNumber);
          if (match != null) return match;
        }
      }

      // Fallback: search by name only
      response = await SupabaseConfig.client
          .from('players')
          .select()
          .ilike('name', '%$longestWord%')
          .limit(10);

      return response.isNotEmpty ? _findBestMatch(response, normalizedName, jerseyNumber) : null;
    } catch (e) {
      debugPrint('❌ Error buscando por nombre: $e');
      return null;
    }
  }

  // Find best match from candidates (fast, no DB calls)
  static Player? _findBestMatch(List<dynamic> candidates, String normalizedName, int? jerseyNumber) {
    if (candidates.isEmpty) return null;
    if (candidates.length == 1) return Player.fromJson(candidates.first);

    Player? bestMatch;
    double bestScore = 0;

    for (var playerData in candidates) {
      final playerName = _normalizeNameForSearch(playerData['name']?.toString() ?? '');
      double score = _calculateNameSimilarity(normalizedName, playerName);

      if (jerseyNumber != null && playerData['jersey_number'] == jerseyNumber) {
        score += 0.3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = Player.fromJson(playerData);
      }
    }

    return bestMatch;
  }

  // Normalize name for comparison (remove accents, lowercase, extra spaces)
  static String _normalizeNameForSearch(String name) {
    // Convert to lowercase
    var normalized = name.toLowerCase();

    // Replace common accent variations
    const accents = {
      'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a',
      'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
      'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
      'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o',
      'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
      'ñ': 'n', 'ç': 'c',
    };

    for (var entry in accents.entries) {
      normalized = normalized.replaceAll(entry.key, entry.value);
    }

    // Remove extra spaces and trim
    normalized = normalized.replaceAll(RegExp(r'\s+'), ' ').trim();

    return normalized;
  }

  // Calculate similarity between two names (0.0 to 1.0)
  static double _calculateNameSimilarity(String name1, String name2) {
    if (name1.isEmpty || name2.isEmpty) return 0;

    // Split into words
    final words1 = name1.split(' ').where((w) => w.isNotEmpty).toList();
    final words2 = name2.split(' ').where((w) => w.isNotEmpty).toList();

    if (words1.isEmpty || words2.isEmpty) return 0;

    // Count matching words (with some tolerance for typos)
    int matchingWords = 0;
    for (var word1 in words1) {
      for (var word2 in words2) {
        if (_areWordsSimilar(word1, word2)) {
          matchingWords++;
          break;
        }
      }
    }

    // Score based on proportion of matching words
    final maxWords = words1.length > words2.length ? words1.length : words2.length;
    return matchingWords / maxWords;
  }

  // Check if two words are similar (allowing for minor typos)
  static bool _areWordsSimilar(String word1, String word2) {
    if (word1 == word2) return true;

    // Allow 1 character difference for words >= 4 characters
    if (word1.length >= 4 && word2.length >= 4) {
      final distance = _levenshteinDistance(word1, word2);
      return distance <= 1;
    }

    // For shorter words, require exact match
    return false;
  }

  // Calculate Levenshtein distance between two strings
  static int _levenshteinDistance(String s1, String s2) {
    if (s1 == s2) return 0;
    if (s1.isEmpty) return s2.length;
    if (s2.isEmpty) return s1.length;

    List<int> v0 = List<int>.generate(s2.length + 1, (i) => i);
    List<int> v1 = List<int>.filled(s2.length + 1, 0);

    for (int i = 0; i < s1.length; i++) {
      v1[0] = i + 1;

      for (int j = 0; j < s2.length; j++) {
        int cost = s1[i] == s2[j] ? 0 : 1;
        v1[j + 1] = [v1[j] + 1, v0[j + 1] + 1, v0[j] + cost].reduce((a, b) => a < b ? a : b);
      }

      final temp = v0;
      v0 = v1;
      v1 = temp;
    }

    return v0[s2.length];
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

  // Set player statistics for a specific match (absolute value, not increment)
  static Future<bool> setPlayerStats({
    required String playerId,
    required String matchId,
    required String statType,
    required int value,
  }) async {
    try {
      print('📊 Estableciendo estadística: $statType = $value para jugador $playerId en partido $matchId');

      // Check if player_stats record exists for this player and match
      final existingStats = await SupabaseConfig.client
          .from('player_stats')
          .select()
          .eq('player_id', playerId)
          .eq('match_id', matchId)
          .maybeSingle();

      if (existingStats != null) {
        // Update existing record
        await SupabaseConfig.client
            .from('player_stats')
            .update({
              statType: value,
              'updated_at': DateTime.now().toIso8601String(),
            })
            .eq('player_id', playerId)
            .eq('match_id', matchId);

        print('✅ Estadística actualizada: $statType = $value');
      } else {
        // Create new record
        final Map<String, dynamic> newStats = {
          'player_id': playerId,
          'match_id': matchId,
          'goals': 0,
          'assists': 0,
          'yellow_cards': 0,
          'red_cards': 0,
          'minutes_played': 90,
        };

        // Set the specific stat
        newStats[statType] = value;

        await SupabaseConfig.client
            .from('player_stats')
            .insert(newStats);

        print('✅ Nuevo registro de estadísticas creado con $statType = $value');
      }

      return true;
    } catch (e) {
      print('❌ Error estableciendo estadísticas: $e');
      return false;
    }
  }
}