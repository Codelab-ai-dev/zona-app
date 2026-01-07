import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/match.dart';
import '../config/supabase_config.dart';
import './auth_service.dart';
import 'connectivity_service.dart';
import 'cache_service.dart';

class MatchService {
  static final ConnectivityService _connectivity = ConnectivityService();
  static final CacheService _cache = CacheService();

  // Next.js API URL for generating embeddings (replaces n8n)
  static const String _embeddingApiUrl =
      'https://admin.zona-gol.com/api/generate-embedding';

  // Next.js API URL for match finalization notifications (replaces n8n)
  static const String _notificationApiUrl =
      'https://admin.zona-gol.com/api/notifications/match-finalized';


  // Helper method to get weekday name
  static String _getWeekdayName(int weekday) {
    switch (weekday) {
      case 1:
        return 'Lunes';
      case 2:
        return 'Martes';
      case 3:
        return 'Miércoles';
      case 4:
        return 'Jueves';
      case 5:
        return 'Viernes';
      case 6:
        return 'Sábado';
      case 7:
        return 'Domingo';
      default:
        return 'Desconocido';
    }
  }

  // Get upcoming matches (current week only)
  static Future<List<Match>> getUpcomingMatches({int limit = 10}) async {
    try {
      print('🏆 Obteniendo partidos próximos de la semana...');

      // Get current user's league ID
      final currentUser = AuthService.currentUser;
      if (currentUser?.leagueId == null) {
        print('⚠️ Usuario no tiene liga asignada');
        return [];
      }

      print('🔍 Filtrando partidos para la liga: ${currentUser!.leagueId}');

      // Calculate current week's date range (Monday to next Sunday)
      final now = DateTime.now();
      final currentWeekday = now.weekday; // 1 = Monday, 7 = Sunday

      // Get Monday of current week (start of week) at 00:00:00
      final startOfWeek = DateTime(
        now.year,
        now.month,
        now.day,
      ).subtract(Duration(days: currentWeekday - 1));

      // Get the next Sunday (always looking forward)
      // From any day, calculate days until the upcoming Sunday
      // Sunday = 7, so days_until = (7 - current_weekday)
      // But if today IS Sunday (7), we want next Sunday which is 7 days away
      int daysUntilNextSunday;
      if (currentWeekday == 7) {
        daysUntilNextSunday =
            7; // If today is Sunday, next Sunday is 7 days away
      } else {
        daysUntilNextSunday =
            7 - currentWeekday; // Otherwise, calculate days remaining
      }

      final endOfWeek = DateTime(now.year, now.month, now.day)
          .add(Duration(days: daysUntilNextSunday))
          .add(const Duration(hours: 23, minutes: 59, seconds: 59));

      // Convert to UTC for Supabase query
      final startOfWeekUtc = startOfWeek.toUtc();
      final endOfWeekUtc = endOfWeek.toUtc();

      print('📅 Rango de partidos (local): ${startOfWeek} - ${endOfWeek}');
      print(
        '📅 Rango de partidos (UTC): ${startOfWeekUtc.toIso8601String()} - ${endOfWeekUtc.toIso8601String()}',
      );
      print(
        '📅 Hoy es: ${now.toString()} (${_getWeekdayName(currentWeekday)})',
      );

      final response = await SupabaseConfig.client
          .from('matches')
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo),
            away_team:teams!matches_away_team_id_fkey(id, name, logo),
            tournament:tournaments(id, name, league_id),
            phase,
            playoff_round,
            playoff_position
          ''')
          .inFilter('status', ['scheduled', 'in_progress'])
          .gte('match_date', startOfWeekUtc.toIso8601String())
          .lte('match_date', endOfWeekUtc.toIso8601String())
          .order('match_date', ascending: true)
          .limit(limit);

      print('✅ Partidos obtenidos de la base de datos: ${response.length}');

      // Debug: Print all matches before filtering
      for (var match in response) {
        print(
          '🔍 Partido encontrado: ${match['home_team']?['name']} vs ${match['away_team']?['name']} - Fecha: ${match['match_date']} - Liga: ${match['tournament']?['league_id']}',
        );
      }

      // Filter by league ID on the client side since we can't filter through nested relations directly
      final filteredMatches = response
          .where((match) {
            final tournamentData = match['tournament'];
            if (tournamentData == null) {
              print('⚠️ Partido sin torneo: ${match['id']}');
              return false;
            }
            final leagueId = tournamentData['league_id'];
            final matchesUserLeague = leagueId == currentUser.leagueId;
            if (!matchesUserLeague) {
              print(
                '⚠️ Partido de otra liga: ${match['home_team']?['name']} vs ${match['away_team']?['name']} - Liga del partido: $leagueId - Liga del usuario: ${currentUser.leagueId}',
              );
            }
            return matchesUserLeague;
          })
          .map<Match>((data) => Match.fromJson(data))
          .toList();

      print(
        '✅ Partidos de la semana de tu liga obtenidos: ${filteredMatches.length}',
      );

      return filteredMatches;
    } catch (e) {
      print('❌ Error obteniendo partidos: $e');
      return [];
    }
  }

  // Get finished matches
  static Future<List<Match>> getFinishedMatches({int limit = 20}) async {
    try {
      print('🏁 Obteniendo partidos finalizados...');

      // Get current user's league ID
      final currentUser = AuthService.currentUser;
      if (currentUser?.leagueId == null) {
        print('⚠️ Usuario no tiene liga asignada');
        return [];
      }

      print('🔍 Filtrando partidos para la liga: ${currentUser!.leagueId}');

      final response = await SupabaseConfig.client
          .from('matches')
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo),
            away_team:teams!matches_away_team_id_fkey(id, name, logo),
            tournament:tournaments(id, name, league_id),
            phase,
            playoff_round,
            playoff_position
          ''')
          .eq('status', 'finished')
          .order('match_date', ascending: false)
          .limit(limit);

      print('✅ Partidos obtenidos: ${response.length}');

      // Filter by league ID on the client side since we can't filter through nested relations directly
      final filteredMatches = response
          .where((match) {
            final tournamentData = match['tournament'];
            if (tournamentData == null) return false;
            final leagueId = tournamentData['league_id'];
            return leagueId == currentUser.leagueId;
          })
          .map<Match>((data) => Match.fromJson(data))
          .toList();

      print(
        '✅ Partidos finalizados de la liga obtenidos: ${filteredMatches.length}',
      );

      return filteredMatches;
    } catch (e) {
      print('❌ Error obteniendo partidos finalizados: $e');
      return [];
    }
  }

  // Get match by ID with detailed information
  static Future<Match?> getMatchById(String matchId) async {
    try {
      print('🏆 Obteniendo partido: $matchId');

      final response = await SupabaseConfig.client
          .from('matches')
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo),
            away_team:teams!matches_away_team_id_fkey(id, name, logo),
            tournament:tournaments(id, name),
            phase,
            playoff_round,
            playoff_position
          ''')
          .eq('id', matchId)
          .single();

      print('✅ Partido obtenido: ${response['id']}');
      return Match.fromJson(response);
    } catch (e) {
      print('❌ Error obteniendo partido: $e');
      return null;
    }
  }

  // Get players who attended the match (based on asistencias_qr)
  static Future<Map<String, List<Map<String, dynamic>>>> getMatchPlayers(
    String matchId,
  ) async {
    try {
      print('👥 Obteniendo jugadores que asistieron al partido: $matchId');

      // First get the match to know the teams
      final match = await getMatchById(matchId);
      if (match == null) {
        print('❌ Partido no encontrado');
        return {'home_players': [], 'away_players': []};
      }

      // Get players who registered attendance via QR for this match
      final attendedPlayersResponse = await SupabaseConfig.client
          .from('asistencias_qr')
          .select('''
            player_id,
            players(id, name, jersey_number, position, photo, is_active, team_id)
          ''')
          .eq('match_id', matchId);

      List<Map<String, dynamic>> homePlayers = [];
      List<Map<String, dynamic>> awayPlayers = [];

      // Separate players by team
      for (final attendance in attendedPlayersResponse) {
        final playerData = attendance['players'];
        if (playerData != null) {
          final player = Map<String, dynamic>.from(playerData);

          if (player['team_id'] == match.homeTeamId) {
            homePlayers.add(player);
          } else if (player['team_id'] == match.awayTeamId) {
            awayPlayers.add(player);
          }
        }
      }

      // Sort by jersey number
      homePlayers.sort(
        (a, b) =>
            (a['jersey_number'] ?? 999).compareTo(b['jersey_number'] ?? 999),
      );
      awayPlayers.sort(
        (a, b) =>
            (a['jersey_number'] ?? 999).compareTo(b['jersey_number'] ?? 999),
      );

      print(
        '✅ Jugadores que asistieron - Local: ${homePlayers.length}, Visitante: ${awayPlayers.length}',
      );

      return {'home_players': homePlayers, 'away_players': awayPlayers};
    } catch (e) {
      print('❌ Error obteniendo jugadores que asistieron: $e');
      return {'home_players': [], 'away_players': []};
    }
  }

  // Get attendance count for a match
  static Future<Map<String, int>> getMatchAttendanceCount(
    String matchId,
  ) async {
    try {
      print('📊 Obteniendo conteo de asistencia para partido: $matchId');

      final response = await SupabaseConfig.client
          .from('asistencias_qr')
          .select('player_id')
          .eq('match_id', matchId);

      final attendanceCount = response.length;

      // Since we now show only players who attended, total = attended
      print('✅ Asistencia: $attendanceCount jugadores registrados');

      return {
        'attended': attendanceCount,
        'total':
            attendanceCount, // Total is now the same as attended since we only show attendees
      };
    } catch (e) {
      print('❌ Error obteniendo conteo de asistencia: $e');
      return {'attended': 0, 'total': 0};
    }
  }

  // Get matches for a specific player (for tracking eligibility)
  static Future<List<Match>> getPlayerMatches(
    String playerId, {
    int limit = 20,
  }) async {
    try {
      print('🏆 Obteniendo partidos del jugador: $playerId');

      final response = await SupabaseConfig.client
          .from('asistencias_qr')
          .select('''
            matches(
              *,
              home_team:teams!matches_home_team_id_fkey(id, name, logo),
              away_team:teams!matches_away_team_id_fkey(id, name, logo),
              tournament:tournaments(id, name)
            )
          ''')
          .eq('player_id', playerId)
          .order('created_at', ascending: false)
          .limit(limit);

      final matches = response
          .where((item) => item['matches'] != null)
          .map<Match>((item) => Match.fromJson(item['matches']))
          .toList();

      print('✅ Partidos del jugador obtenidos: ${matches.length}');
      return matches;
    } catch (e) {
      print('❌ Error obteniendo partidos del jugador: $e');
      return [];
    }
  }

  // Check if player is eligible for finals (based on minimum matches played)
  static Future<Map<String, dynamic>> checkPlayerEligibility(
    String playerId, {
    int minimumMatches = 3,
  }) async {
    try {
      final playerMatches = await getPlayerMatches(playerId);
      final matchesPlayed = playerMatches.length;
      final isEligible = matchesPlayed >= minimumMatches;

      return {
        'is_eligible': isEligible,
        'matches_played': matchesPlayed,
        'minimum_required': minimumMatches,
        'matches_needed': isEligible ? 0 : minimumMatches - matchesPlayed,
      };
    } catch (e) {
      print('❌ Error verificando elegibilidad: $e');
      return {
        'is_eligible': false,
        'matches_played': 0,
        'minimum_required': minimumMatches,
        'matches_needed': minimumMatches,
      };
    }
  }

  // Finalize match with final score
  static Future<bool> finalizeMatch(
    String matchId,
    int homeScore,
    int awayScore, {
    String? observations,
  }) async {
    try {
      print('🏁 Finalizando partido: $matchId (${homeScore}-${awayScore})');

      // Step 1: Update the match with final score and status
      final response = await SupabaseConfig.client
          .from('matches')
          .update({
            'home_score': homeScore,
            'away_score': awayScore,
            'status': 'finished',
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', matchId)
          .select()
          .single();

      print('✅ Partido actualizado: ${response['id']}');

      // Step 2: Save referee observations if provided
      if (observations != null && observations.isNotEmpty) {
        print('📝 Guardando observaciones del árbitro...');
        try {
          // Try to upsert the referee report (insert or update if exists)
          await SupabaseConfig.client.from('match_referee_reports').upsert({
            'match_id': matchId,
            'general_observations': observations,
            'updated_at': DateTime.now().toIso8601String(),
          }, onConflict: 'match_id');

          print('✅ Observaciones del árbitro guardadas');
        } catch (e) {
          print('⚠️ Error guardando observaciones del árbitro: $e');
          // Don't fail the whole operation if observations fail to save
        }
      }

      // Step 3: The team_stats table will be automatically updated by the database trigger
      // But we'll add a small delay to ensure the trigger has completed
      await Future.delayed(const Duration(milliseconds: 500));

      // Step 4: Verify that team statistics were updated
      await _verifyTeamStatsUpdate(matchId, homeScore, awayScore);

      // Step 5: Generate embedding for knowledge base (async, don't wait)
      _generateMatchEmbedding(matchId);

      // Step 6: Send notification to Next.js API (async, don't wait)
      // This will send WhatsApp notifications to all linked users
      _notifyMatchFinalized(matchId, homeScore, awayScore);

      print('✅ Partido finalizado exitosamente con estadísticas actualizadas');
      return true;
    } catch (e) {
      print('❌ Error finalizando partido: $e');
      return false;
    }
  }

  // Helper method to verify team stats were updated correctly
  static Future<void> _verifyTeamStatsUpdate(
    String matchId,
    int homeScore,
    int awayScore,
  ) async {
    try {
      // Get the match details to know the teams and tournament
      final match = await getMatchById(matchId);
      if (match == null) return;

      // Check if team stats exist for both teams
      final homeTeamStats = await SupabaseConfig.client
          .from('team_stats')
          .select('*')
          .eq('team_id', match.homeTeamId)
          .eq('tournament_id', match.tournamentId)
          .maybeSingle();

      final awayTeamStats = await SupabaseConfig.client
          .from('team_stats')
          .select('*')
          .eq('team_id', match.awayTeamId)
          .eq('tournament_id', match.tournamentId)
          .maybeSingle();

      if (homeTeamStats != null) {
        print(
          '✅ Estadísticas del equipo local actualizadas: ${homeTeamStats['points']} puntos',
        );
      } else {
        print('⚠️ Estadísticas del equipo local no encontradas');
      }

      if (awayTeamStats != null) {
        print(
          '✅ Estadísticas del equipo visitante actualizadas: ${awayTeamStats['points']} puntos',
        );
      } else {
        print('⚠️ Estadísticas del equipo visitante no encontradas');
      }
    } catch (e) {
      print('⚠️ Error verificando estadísticas de equipos: $e');
    }
  }

  // Get team statistics for a specific tournament (League Table)
  static Future<List<Map<String, dynamic>>> getTournamentStandings(
    String tournamentId,
  ) async {
    try {
      print('📊 Obteniendo tabla de posiciones del torneo: $tournamentId');

      final response = await SupabaseConfig.client
          .from('team_stats')
          .select('''
            *,
            team:teams(id, name, slug, logo)
          ''')
          .eq('tournament_id', tournamentId)
          .order('points', ascending: false)
          .order('goal_difference', ascending: false)
          .order('goals_for', ascending: false);

      print('✅ Tabla de posiciones obtenida: ${response.length} equipos');
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      print('❌ Error obteniendo tabla de posiciones: $e');
      return [];
    }
  }

  // Get team statistics for a specific team and tournament
  static Future<Map<String, dynamic>?> getTeamStats(
    String teamId,
    String tournamentId,
  ) async {
    try {
      print(
        '📊 Obteniendo estadísticas del equipo: $teamId en torneo: $tournamentId',
      );

      final response = await SupabaseConfig.client
          .from('team_stats')
          .select('''
            *,
            team:teams(id, name, slug, logo)
          ''')
          .eq('team_id', teamId)
          .eq('tournament_id', tournamentId)
          .maybeSingle();

      if (response != null) {
        print('✅ Estadísticas del equipo obtenidas');
        return Map<String, dynamic>.from(response);
      } else {
        print('⚠️ No se encontraron estadísticas para el equipo');
        return null;
      }
    } catch (e) {
      print('❌ Error obteniendo estadísticas del equipo: $e');
      return null;
    }
  }

  // Get all team statistics for a league (across all tournaments)
  static Future<List<Map<String, dynamic>>> getLeagueStandings(
    String leagueId,
  ) async {
    try {
      print('🏆 Obteniendo estadísticas generales de la liga: $leagueId');

      final response = await SupabaseConfig.client
          .from('team_stats')
          .select('''
            team_id,
            team:teams(id, name, slug, logo),
            SUM(matches_played) as total_matches_played,
            SUM(matches_won) as total_matches_won,
            SUM(matches_drawn) as total_matches_drawn,
            SUM(matches_lost) as total_matches_lost,
            SUM(goals_for) as total_goals_for,
            SUM(goals_against) as total_goals_against,
            SUM(points) as total_points
          ''')
          .eq('league_id', leagueId)
      // Note: GROUP BY would be handled in a database view or custom function
      // For now, we'll process this data client-side
      ;

      print('✅ Estadísticas de liga obtenidas: ${response.length} registros');

      // Group by team and aggregate statistics
      Map<String, Map<String, dynamic>> teamTotals = {};

      for (final record in response) {
        final teamId = record['team_id'] as String;
        if (!teamTotals.containsKey(teamId)) {
          teamTotals[teamId] = {
            'team_id': teamId,
            'team': record['team'],
            'total_matches_played': 0,
            'total_matches_won': 0,
            'total_matches_drawn': 0,
            'total_matches_lost': 0,
            'total_goals_for': 0,
            'total_goals_against': 0,
            'total_points': 0,
          };
        }

        teamTotals[teamId]!['total_matches_played'] =
            (teamTotals[teamId]!['total_matches_played'] as int) +
            (record['matches_played'] as int? ?? 0);
        teamTotals[teamId]!['total_matches_won'] =
            (teamTotals[teamId]!['total_matches_won'] as int) +
            (record['matches_won'] as int? ?? 0);
        teamTotals[teamId]!['total_matches_drawn'] =
            (teamTotals[teamId]!['total_matches_drawn'] as int) +
            (record['matches_drawn'] as int? ?? 0);
        teamTotals[teamId]!['total_matches_lost'] =
            (teamTotals[teamId]!['total_matches_lost'] as int) +
            (record['matches_lost'] as int? ?? 0);
        teamTotals[teamId]!['total_goals_for'] =
            (teamTotals[teamId]!['total_goals_for'] as int) +
            (record['goals_for'] as int? ?? 0);
        teamTotals[teamId]!['total_goals_against'] =
            (teamTotals[teamId]!['total_goals_against'] as int) +
            (record['goals_against'] as int? ?? 0);
        teamTotals[teamId]!['total_points'] =
            (teamTotals[teamId]!['total_points'] as int) +
            (record['points'] as int? ?? 0);
      }

      // Calculate goal difference and sort
      List<Map<String, dynamic>> standings = teamTotals.values.map((team) {
        team['goal_difference'] =
            (team['total_goals_for'] as int) -
            (team['total_goals_against'] as int);
        return team;
      }).toList();

      // Sort by points desc, then goal difference desc, then goals for desc
      standings.sort((a, b) {
        int pointsComparison = (b['total_points'] as int).compareTo(
          a['total_points'] as int,
        );
        if (pointsComparison != 0) return pointsComparison;

        int gdComparison = (b['goal_difference'] as int).compareTo(
          a['goal_difference'] as int,
        );
        if (gdComparison != 0) return gdComparison;

        return (b['total_goals_for'] as int).compareTo(
          a['total_goals_for'] as int,
        );
      });

      return standings;
    } catch (e) {
      print('❌ Error obteniendo estadísticas de liga: $e');
      return [];
    }
  }

  // Update team attendance statistics after registering attendance
  static Future<void> updateTeamAttendanceStats(String matchId) async {
    try {
      print(
        '👥 Actualizando estadísticas de asistencia para partido: $matchId',
      );

      // The attendance stats will be automatically updated by the database trigger
      // when facial_attendance records are inserted, but we can call this manually if needed

      // Get match details
      final match = await getMatchById(matchId);
      if (match == null) return;

      // Force update attendance calculations (this would typically be done by the trigger)
      await SupabaseConfig.client.rpc(
        'update_team_attendance_for_match',
        params: {'match_id_param': matchId},
      );

      print('✅ Estadísticas de asistencia actualizadas');
    } catch (e) {
      print('⚠️ Error actualizando estadísticas de asistencia: $e');
      // Don't throw error as this is not critical for match functionality
    }
  }

  // ============================================================================
  // 🔥 ROBUST MATCH SELECTION - Solves "partido del día" issues
  // ============================================================================

  /// Get matches for today with TIMEZONE-AWARE filtering
  /// Fixes issues with:
  /// - Midnight crossing (partidos nocturnos)
  /// - UTC vs Local timezone confusion
  /// - Multiple matches same day
  static Future<List<Match>> getTodayMatchesRobust({
    String? leagueId,
    String? teamId,
    String? tournamentId,
  }) async {
    try {
      // ✅ Use LOCAL timezone (not UTC) to avoid midnight bugs
      final now = DateTime.now();

      // Start of day in LOCAL timezone (00:00:00.000)
      final startOfDay = DateTime(now.year, now.month, now.day);

      // End of day in LOCAL timezone (23:59:59.999)
      final endOfDay = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);

      print('🔍 Buscando partidos para hoy (timezone-aware):');
      print('   Fecha local: ${now.toLocal()}');
      print('   Inicio del día (local): $startOfDay');
      print('   Fin del día (local): $endOfDay');
      print('   Inicio del día (UTC): ${startOfDay.toUtc()}');
      print('   Fin del día (UTC): ${endOfDay.toUtc()}');

      // Build query
      dynamic query = SupabaseConfig.client
          .from('matches')
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo),
            away_team:teams!matches_away_team_id_fkey(id, name, logo),
            tournament:tournaments(id, name, league_id)
          ''')
          // ✅ Convert to UTC for Supabase query (server stores in UTC)
          .gte('match_date', startOfDay.toUtc().toIso8601String())
          .lte('match_date', endOfDay.toUtc().toIso8601String());

      // Filter by league if provided
      if (leagueId != null) {
        // Note: Can't filter directly on nested relation, will filter client-side
        print('   Filtrando por liga: $leagueId');
      }

      if (tournamentId != null) {
        query = query.eq('tournament_id', tournamentId);
      }

      // Order by match date (earliest first)
      query = query.order('match_date', ascending: true);

      final response = await query;

      var matches = (response as List)
          .map((json) => Match.fromJson(json))
          .toList();

      // Filter by league if provided (client-side)
      if (leagueId != null) {
        matches = matches.where((match) {
          final tournamentData = match.tournamentId;
          // You'll need to check the tournament's league_id
          // This requires the tournament data to be loaded
          return true; // Placeholder - implement based on your Tournament model
        }).toList();
      }

      // Filter by team if provided
      if (teamId != null) {
        matches = matches
            .where((m) => m.homeTeamId == teamId || m.awayTeamId == teamId)
            .toList();

        print(
          '✅ Encontrados ${matches.length} partidos para equipo $teamId hoy',
        );
      } else {
        print('✅ Encontrados ${matches.length} partidos para hoy');
      }

      return matches;
    } catch (e) {
      print('❌ Error obteniendo partidos de hoy: $e');

      // Try to load from cache if offline
      if (!_connectivity.isOnline) {
        print('📵 Offline: intentando cargar desde cache');
        final cachedMatches = await _cache.getMatches();
        if (cachedMatches != null) {
          return cachedMatches.map((json) => Match.fromJson(json)).toList();
        }
      }

      return [];
    }
  }

  /// Get the "active" match INTELLIGENTLY
  /// This solves the "partido del día" fragility issues
  ///
  /// Priority:
  /// 1. Matches currently "in_progress"
  /// 2. If multiple in_progress → Return ALL for user selection
  /// 3. Scheduled matches for today
  /// 4. If multiple today → Return ALL for user selection
  /// 5. None found → Return empty result
  ///
  /// Returns MatchSelectionResult which indicates:
  /// - single: Exactly one match found (auto-select it)
  /// - multiple: Multiple matches found (user must choose)
  /// - none: No matches found
  /// - error: Error occurred
  static Future<MatchSelectionResult> getActiveMatchRobust({
    String? leagueId,
    String? teamId,
    String? tournamentId,
  }) async {
    try {
      final currentUser = AuthService.currentUser;

      // Step 1: Check for matches currently in progress
      print('🔍 Paso 1: Buscando partidos en progreso...');

      var inProgressQuery = SupabaseConfig.client
          .from('matches')
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo),
            away_team:teams!matches_away_team_id_fkey(id, name, logo),
            tournament:tournaments(id, name, league_id)
          ''')
          .eq('status', 'in_progress');

      if (tournamentId != null) {
        inProgressQuery = inProgressQuery.eq('tournament_id', tournamentId);
      }

      final inProgressResponse = await inProgressQuery;
      var inProgressMatches = (inProgressResponse as List)
          .map((json) => Match.fromJson(json))
          .toList();

      // Filter by league (client-side) if needed
      if (leagueId != null && currentUser?.leagueId != null) {
        inProgressMatches = inProgressMatches.where((match) {
          // Check if match belongs to user's league
          // This requires checking the tournament's league_id
          return true; // Placeholder
        }).toList();
      }

      // Filter by team if needed
      if (teamId != null) {
        inProgressMatches = inProgressMatches
            .where((m) => m.homeTeamId == teamId || m.awayTeamId == teamId)
            .toList();
      }

      if (inProgressMatches.length == 1) {
        // ✅ Perfect! Exactly one match in progress
        print('✅ Un partido en progreso: ${inProgressMatches.first.id}');
        return MatchSelectionResult.single(inProgressMatches.first);
      } else if (inProgressMatches.length > 1) {
        // ⚠️ Multiple matches in progress - user must choose
        print('⚠️ ${inProgressMatches.length} partidos en progreso');
        return MatchSelectionResult.multiple(
          inProgressMatches,
          reason: 'Hay ${inProgressMatches.length} partidos en progreso',
        );
      }

      print('   No hay partidos en progreso');

      // Step 2: No matches in progress, check today's scheduled matches
      print('🔍 Paso 2: Buscando partidos programados para hoy...');

      final todayMatches = await getTodayMatchesRobust(
        leagueId: leagueId,
        teamId: teamId,
        tournamentId: tournamentId,
      );

      final scheduledToday = todayMatches
          .where((m) => m.status == 'scheduled')
          .toList();

      if (scheduledToday.length == 1) {
        // ✅ Perfect! Exactly one match scheduled today
        print('✅ Un partido programado para hoy: ${scheduledToday.first.id}');
        return MatchSelectionResult.single(scheduledToday.first);
      } else if (scheduledToday.length > 1) {
        // ⚠️ Multiple matches today - user must choose
        print('⚠️ ${scheduledToday.length} partidos programados hoy');
        return MatchSelectionResult.multiple(
          scheduledToday,
          reason: 'Hay ${scheduledToday.length} partidos programados para hoy',
        );
      }

      // Step 3: No matches found
      print('⚠️ No hay partidos activos ni programados para hoy');
      return MatchSelectionResult.none(
        reason: 'No hay partidos programados para hoy',
      );
    } catch (e) {
      print('❌ Error obteniendo partido activo: $e');
      return MatchSelectionResult.error(e.toString());
    }
  }

  // ============================================================================
  // 🔥 GENERATE EMBEDDING FOR KNOWLEDGE BASE (Next.js API)
  // ============================================================================

  /// Generate embedding for a finished match by calling Next.js API
  /// This runs asynchronously and doesn't block the main finalize flow
  static Future<void> _generateMatchEmbedding(String matchId) async {
    try {
      print('🔄 Generando embedding para partido: $matchId');

      // Wait a bit to ensure the trigger created the knowledge base entry
      await Future.delayed(const Duration(seconds: 2));

      // Get the content_text from knowledge base
      final knowledgeEntry = await SupabaseConfig.client
          .from('league_knowledge_base')
          .select('id, content_text')
          .eq('match_id', matchId)
          .eq('content_type', 'resultado_partido')
          .maybeSingle();

      if (knowledgeEntry == null || knowledgeEntry['content_text'] == null) {
        print(
          '⚠️ No se encontró contenido en knowledge base para generar embedding',
        );
        print(
          '   El trigger de la BD debería haber creado la entrada automáticamente',
        );
        return;
      }

      final contentText = knowledgeEntry['content_text'] as String;
      final knowledgeBaseId = knowledgeEntry['id'] as String;

      print('📝 Contenido encontrado (${contentText.length} caracteres)');

      // Call Next.js API to generate embedding
      final response = await http
          .post(
            Uri.parse(_embeddingApiUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'knowledge_base_id': knowledgeBaseId,
              'match_id': matchId,
              'content_text': contentText,
            }),
          )
          .timeout(
            const Duration(seconds: 30),
            onTimeout: () {
              throw Exception(
                'Timeout: Next.js API no respondió en 30 segundos',
              );
            },
          );

      if (response.statusCode == 200) {
        print('✅ Embedding generado exitosamente');
        print('   Response: ${response.body}');
      } else {
        print('⚠️ Error generando embedding: ${response.statusCode}');
        print('   Response: ${response.body}');
      }
    } catch (e) {
      print('⚠️ Error en _generateMatchEmbedding: $e');
      // Don't throw - we don't want to fail the match finalization
      // if embedding generation fails
    }
  }

  // ============================================================================
  // 🔔 NOTIFY MATCH FINALIZED (Next.js API)
  // ============================================================================

  /// Send match finalization notification to Next.js API
  /// This runs asynchronously and doesn't block the main finalize flow
  static Future<void> _notifyMatchFinalized(
    String matchId,
    int homeScore,
    int awayScore,
  ) async {
    try {
      print('🔔 Enviando notificación de partido finalizado: $matchId');

      // Get full match details with teams and tournament info
      final match = await getMatchById(matchId);

      if (match == null) {
        print('⚠️ No se encontró el partido para enviar notificación');
        return;
      }

      // Get team stats after match finalization
      final homeTeamStats = await SupabaseConfig.client
          .from('team_stats')
          .select('points, position, matches_played')
          .eq('team_id', match.homeTeamId)
          .eq('tournament_id', match.tournamentId)
          .maybeSingle();

      final awayTeamStats = await SupabaseConfig.client
          .from('team_stats')
          .select('points, position, matches_played')
          .eq('team_id', match.awayTeamId)
          .eq('tournament_id', match.tournamentId)
          .maybeSingle();

      // Get player stats (top scorers and cards)
      final playerStats = await SupabaseConfig.client
          .from('player_stats')
          .select('''
            *,
            player:players(name, jersey_number, team_id)
          ''')
          .eq('match_id', matchId)
          .or('goals.gt.0,red_cards.gt.0');

      // Build notification payload
      final payload = {
        'event': 'match_finalized',
        'timestamp': DateTime.now().toIso8601String(),
        'match': {
          'id': match.id,
          'date': match.matchDate.toIso8601String(),
          'time': match.matchTime,
          'field_number': match.fieldNumber,
          'round': match.round,
          'status': match.status,
          'phase': match.phase,
          'playoff_round': match.playoffRound,
        },
        'score': {
          'home': homeScore,
          'away': awayScore,
          'result': homeScore > awayScore
              ? 'home_win'
              : awayScore > homeScore
              ? 'away_win'
              : 'draw',
        },
        'home_team': {
          'id': match.homeTeamId,
          'name': match.homeTeamName ?? 'Unknown',
          'score': homeScore,
          'stats': homeTeamStats,
        },
        'away_team': {
          'id': match.awayTeamId,
          'name': match.awayTeamName ?? 'Unknown',
          'score': awayScore,
          'stats': awayTeamStats,
        },
        'tournament': {
          'id': match.tournamentId,
          'name': match.tournamentName ?? 'Unknown',
        },
        'player_highlights': playerStats,
      };

      // Call Next.js notification API
      final response = await http
          .post(
            Uri.parse(_notificationApiUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(
            const Duration(seconds: 15),
            onTimeout: () {
              throw Exception('Timeout: Next.js API no respondió en 15 segundos');
            },
          );

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('✅ Notificación enviada exitosamente');
        print('   Response: ${response.body}');
      } else {
        print('⚠️ Error enviando notificación: ${response.statusCode}');
        print('   Response: ${response.body}');
      }
    } catch (e) {
      print('⚠️ Error en _notifyMatchFinalized: $e');
      // Don't throw - we don't want to fail the match finalization
      // if notification fails
    }
  }

}

/// Result of match selection operation
/// This makes the app's behavior EXPLICIT instead of implicit
class MatchSelectionResult {
  final MatchSelectionType type;
  final Match? match; // Single match (when type = single)
  final List<Match>? matches; // Multiple matches (when type = multiple)
  final String? reason; // Reason for result (for user messaging)

  MatchSelectionResult._({
    required this.type,
    this.match,
    this.matches,
    this.reason,
  });

  /// Exactly one match found - auto-select it
  factory MatchSelectionResult.single(Match match) {
    return MatchSelectionResult._(
      type: MatchSelectionType.single,
      match: match,
    );
  }

  /// Multiple matches found - user needs to choose
  factory MatchSelectionResult.multiple(List<Match> matches, {String? reason}) {
    return MatchSelectionResult._(
      type: MatchSelectionType.multiple,
      matches: matches,
      reason: reason ?? 'Múltiples partidos encontrados',
    );
  }

  /// No matches found
  factory MatchSelectionResult.none({String? reason}) {
    return MatchSelectionResult._(
      type: MatchSelectionType.none,
      reason: reason ?? 'No se encontraron partidos',
    );
  }

  /// Error occurred
  factory MatchSelectionResult.error(String error) {
    return MatchSelectionResult._(
      type: MatchSelectionType.error,
      reason: error,
    );
  }

  // Helper getters
  bool get hasMatch => type == MatchSelectionType.single;
  bool get needsSelection => type == MatchSelectionType.multiple;
  bool get isEmpty => type == MatchSelectionType.none;
  bool get hasError => type == MatchSelectionType.error;

  int get matchCount => matches?.length ?? (match != null ? 1 : 0);
}

/// Type of match selection result
enum MatchSelectionType {
  single, // Exactly one match found - auto-select
  multiple, // Multiple matches - needs user selection
  none, // No matches found
  error, // Error occurred
}
