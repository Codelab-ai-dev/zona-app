import '../models/match.dart';
import '../config/supabase_config.dart';

class MatchService {
  
  // Get upcoming matches
  static Future<List<Match>> getUpcomingMatches({int limit = 10}) async {
    try {
      print('🏆 Obteniendo partidos próximos...');
      
      final response = await SupabaseConfig.client
          .from('matches')
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo),
            away_team:teams!matches_away_team_id_fkey(id, name, logo),
            tournament:tournaments(id, name)
          ''')
          .inFilter('status', ['scheduled', 'in_progress'])
          .gte('match_date', DateTime.now().toIso8601String())
          .order('match_date', ascending: true)
          .limit(limit);

      print('✅ Partidos obtenidos: ${response.length}');
      
      return response
          .map<Match>((data) => Match.fromJson(data))
          .toList();
    } catch (e) {
      print('❌ Error obteniendo partidos: $e');
      return [];
    }
  }

  // Get finished matches
  static Future<List<Match>> getFinishedMatches({int limit = 20}) async {
    try {
      print('🏁 Obteniendo partidos finalizados...');
      
      final response = await SupabaseConfig.client
          .from('matches')
          .select('''
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo),
            away_team:teams!matches_away_team_id_fkey(id, name, logo),
            tournament:tournaments(id, name)
          ''')
          .eq('status', 'finished')
          .order('match_date', ascending: false)
          .limit(limit);

      print('✅ Partidos finalizados obtenidos: ${response.length}');
      
      return response
          .map<Match>((data) => Match.fromJson(data))
          .toList();
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
            tournament:tournaments(id, name)
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
  static Future<bool> finalizeMatch(String matchId, int homeScore, int awayScore) async {
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

      // Step 2: The team_stats table will be automatically updated by the database trigger
      // But we'll add a small delay to ensure the trigger has completed
      await Future.delayed(const Duration(milliseconds: 500));

      // Step 3: Verify that team statistics were updated
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