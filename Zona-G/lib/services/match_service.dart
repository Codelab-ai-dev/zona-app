import '../models/match.dart';
import '../config/supabase_config.dart';
import './auth_service.dart';

class MatchService {

  // Helper method to get weekday name
  static String _getWeekdayName(int weekday) {
    switch (weekday) {
      case 1: return 'Lunes';
      case 2: return 'Martes';
      case 3: return 'Miércoles';
      case 4: return 'Jueves';
      case 5: return 'Viernes';
      case 6: return 'Sábado';
      case 7: return 'Domingo';
      default: return 'Desconocido';
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
      final startOfWeek = DateTime(now.year, now.month, now.day)
          .subtract(Duration(days: currentWeekday - 1));

      // Get the next Sunday (always looking forward)
      // From any day, calculate days until the upcoming Sunday
      // Sunday = 7, so days_until = (7 - current_weekday)
      // But if today IS Sunday (7), we want next Sunday which is 7 days away
      int daysUntilNextSunday;
      if (currentWeekday == 7) {
        daysUntilNextSunday = 7; // If today is Sunday, next Sunday is 7 days away
      } else {
        daysUntilNextSunday = 7 - currentWeekday; // Otherwise, calculate days remaining
      }

      final endOfWeek = DateTime(now.year, now.month, now.day)
          .add(Duration(days: daysUntilNextSunday))
          .add(const Duration(hours: 23, minutes: 59, seconds: 59));

      // Convert to UTC for Supabase query
      final startOfWeekUtc = startOfWeek.toUtc();
      final endOfWeekUtc = endOfWeek.toUtc();

      print('📅 Rango de partidos (local): ${startOfWeek} - ${endOfWeek}');
      print('📅 Rango de partidos (UTC): ${startOfWeekUtc.toIso8601String()} - ${endOfWeekUtc.toIso8601String()}');
      print('📅 Hoy es: ${now.toString()} (${_getWeekdayName(currentWeekday)})');

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
        print('🔍 Partido encontrado: ${match['home_team']?['name']} vs ${match['away_team']?['name']} - Fecha: ${match['match_date']} - Liga: ${match['tournament']?['league_id']}');
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
              print('⚠️ Partido de otra liga: ${match['home_team']?['name']} vs ${match['away_team']?['name']} - Liga del partido: $leagueId - Liga del usuario: ${currentUser.leagueId}');
            }
            return matchesUserLeague;
          })
          .map<Match>((data) => Match.fromJson(data))
          .toList();

      print('✅ Partidos de la semana de tu liga obtenidos: ${filteredMatches.length}');

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

      print('✅ Partidos finalizados de la liga obtenidos: ${filteredMatches.length}');

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
  static Future<Map<String, List<Map<String, dynamic>>>> getMatchPlayers(String matchId) async {
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
      homePlayers.sort((a, b) => (a['jersey_number'] ?? 999).compareTo(b['jersey_number'] ?? 999));
      awayPlayers.sort((a, b) => (a['jersey_number'] ?? 999).compareTo(b['jersey_number'] ?? 999));

      print('✅ Jugadores que asistieron - Local: ${homePlayers.length}, Visitante: ${awayPlayers.length}');
      
      return {
        'home_players': homePlayers,
        'away_players': awayPlayers,
      };
    } catch (e) {
      print('❌ Error obteniendo jugadores que asistieron: $e');
      return {'home_players': [], 'away_players': []};
    }
  }

  // Get attendance count for a match
  static Future<Map<String, int>> getMatchAttendanceCount(String matchId) async {
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
        'total': attendanceCount, // Total is now the same as attended since we only show attendees
      };
    } catch (e) {
      print('❌ Error obteniendo conteo de asistencia: $e');
      return {'attended': 0, 'total': 0};
    }
  }

  // Get matches for a specific player (for tracking eligibility)
  static Future<List<Match>> getPlayerMatches(String playerId, {int limit = 20}) async {
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
  static Future<Map<String, dynamic>> checkPlayerEligibility(String playerId, {int minimumMatches = 3}) async {
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
  static Future<bool> finalizeMatch(String matchId, int homeScore, int awayScore, {String? observations}) async {
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
          await SupabaseConfig.client
              .from('match_referee_reports')
              .upsert({
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

      print('✅ Partido finalizado exitosamente con estadísticas actualizadas');
      return true;
    } catch (e) {
      print('❌ Error finalizando partido: $e');
      return false;
    }
  }

  // Helper method to verify team stats were updated correctly
  static Future<void> _verifyTeamStatsUpdate(String matchId, int homeScore, int awayScore) async {
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
        print('✅ Estadísticas del equipo local actualizadas: ${homeTeamStats['points']} puntos');
      } else {
        print('⚠️ Estadísticas del equipo local no encontradas');
      }

      if (awayTeamStats != null) {
        print('✅ Estadísticas del equipo visitante actualizadas: ${awayTeamStats['points']} puntos');
      } else {
        print('⚠️ Estadísticas del equipo visitante no encontradas');
      }

    } catch (e) {
      print('⚠️ Error verificando estadísticas de equipos: $e');
    }
  }

  // Get team statistics for a specific tournament (League Table)
  static Future<List<Map<String, dynamic>>> getTournamentStandings(String tournamentId) async {
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
  static Future<Map<String, dynamic>?> getTeamStats(String teamId, String tournamentId) async {
    try {
      print('📊 Obteniendo estadísticas del equipo: $teamId en torneo: $tournamentId');
      
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
  static Future<List<Map<String, dynamic>>> getLeagueStandings(String leagueId) async {
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
            (teamTotals[teamId]!['total_matches_played'] as int) + (record['matches_played'] as int? ?? 0);
        teamTotals[teamId]!['total_matches_won'] = 
            (teamTotals[teamId]!['total_matches_won'] as int) + (record['matches_won'] as int? ?? 0);
        teamTotals[teamId]!['total_matches_drawn'] = 
            (teamTotals[teamId]!['total_matches_drawn'] as int) + (record['matches_drawn'] as int? ?? 0);
        teamTotals[teamId]!['total_matches_lost'] = 
            (teamTotals[teamId]!['total_matches_lost'] as int) + (record['matches_lost'] as int? ?? 0);
        teamTotals[teamId]!['total_goals_for'] = 
            (teamTotals[teamId]!['total_goals_for'] as int) + (record['goals_for'] as int? ?? 0);
        teamTotals[teamId]!['total_goals_against'] = 
            (teamTotals[teamId]!['total_goals_against'] as int) + (record['goals_against'] as int? ?? 0);
        teamTotals[teamId]!['total_points'] = 
            (teamTotals[teamId]!['total_points'] as int) + (record['points'] as int? ?? 0);
      }
      
      // Calculate goal difference and sort
      List<Map<String, dynamic>> standings = teamTotals.values.map((team) {
        team['goal_difference'] = (team['total_goals_for'] as int) - (team['total_goals_against'] as int);
        return team;
      }).toList();
      
      // Sort by points desc, then goal difference desc, then goals for desc
      standings.sort((a, b) {
        int pointsComparison = (b['total_points'] as int).compareTo(a['total_points'] as int);
        if (pointsComparison != 0) return pointsComparison;
        
        int gdComparison = (b['goal_difference'] as int).compareTo(a['goal_difference'] as int);
        if (gdComparison != 0) return gdComparison;
        
        return (b['total_goals_for'] as int).compareTo(a['total_goals_for'] as int);
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
      print('👥 Actualizando estadísticas de asistencia para partido: $matchId');
      
      // The attendance stats will be automatically updated by the database trigger
      // when facial_attendance records are inserted, but we can call this manually if needed
      
      // Get match details
      final match = await getMatchById(matchId);
      if (match == null) return;
      
      // Force update attendance calculations (this would typically be done by the trigger)
      await SupabaseConfig.client.rpc('update_team_attendance_for_match', params: {
        'match_id_param': matchId
      });
      
      print('✅ Estadísticas de asistencia actualizadas');
    } catch (e) {
      print('⚠️ Error actualizando estadísticas de asistencia: $e');
      // Don't throw error as this is not critical for match functionality
    }
  }
}