// =====================================================
// SQL SERVICE
// =====================================================
// Ejecuta queries directas a Supabase para datos estructurados
// Calendario, Resultados, Tabla, Suspensiones, Estadísticas
// =====================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SQLQuery } from '@/lib/types/agent.types';

/**
 * Resultado de una query SQL con metadata
 */
interface SQLQueryResult<T = any> {
  data: T[];
  query: SQLQuery;
  executionTime: number;
}

/**
 * Match con información completa
 */
interface MatchData {
  id: string;
  jornada: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  matchDate: string;
  matchTime: string | null;
  status: 'scheduled' | 'in_progress' | 'finished' | 'postponed';
  venue?: string;
}

/**
 * Standing (posición en tabla)
 */
interface StandingData {
  position: number;
  teamName: string;
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

/**
 * Suspensión de jugador
 */
interface SuspensionData {
  playerId: string;
  playerName: string;
  teamName: string;
  yellowCards: number;
  redCards: number;
  suspendedUntil?: string;
  reason?: string;
}

/**
 * Estadística de jugador
 */
interface PlayerStatsData {
  playerId: string;
  playerName: string;
  teamName: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
}

export class SQLService {
  /**
   * Obtiene el calendario de una jornada específica
   *
   * @param jornada - Número de jornada (1-20)
   * @param leagueId - ID de la liga
   * @param tournamentId - ID del torneo (opcional)
   * @returns Lista de partidos de la jornada
   */
  static async getJornadaCalendar(
    jornada: number,
    leagueId: string,
    tournamentId?: string
  ): Promise<SQLQueryResult<MatchData>> {
    const startTime = Date.now();
    const supabase = await createServerSupabaseClient();

    console.log(`📅 SQL: Getting calendar for jornada ${jornada}, league ${leagueId}`);

    let query = supabase
      .from('matches')
      .select(`
        id,
        jornada,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        match_date,
        match_time,
        status,
        venue,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .eq('league_id', leagueId)
      .eq('jornada', jornada)
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true });

    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get jornada calendar: ${error.message}`);
    }

    const matches: MatchData[] = (data || []).map((match: any) => ({
      id: match.id,
      jornada: match.jornada,
      homeTeam: match.home_team?.name || 'Unknown',
      awayTeam: match.away_team?.name || 'Unknown',
      homeScore: match.home_score,
      awayScore: match.away_score,
      matchDate: match.match_date,
      matchTime: match.match_time,
      status: match.status,
      venue: match.venue,
    }));

    const executionTime = Date.now() - startTime;

    console.log(`✅ SQL: Found ${matches.length} matches (${executionTime}ms)`);

    return {
      data: matches,
      query: {
        query: `SELECT matches WHERE league_id = '${leagueId}' AND jornada = ${jornada}`,
        resultCount: matches.length,
        executionTimeMs: executionTime,
      },
      executionTime,
    };
  }

  /**
   * Obtiene partidos de hoy
   *
   * @param leagueId - ID de la liga
   * @param tournamentId - ID del torneo (opcional)
   * @returns Partidos de hoy
   */
  static async getTodayMatches(
    leagueId: string,
    tournamentId?: string
  ): Promise<SQLQueryResult<MatchData>> {
    const startTime = Date.now();
    const supabase = await createServerSupabaseClient();

    const today = new Date().toISOString().split('T')[0];

    console.log(`📅 SQL: Getting today's matches (${today}), league ${leagueId}`);

    let query = supabase
      .from('matches')
      .select(`
        id,
        jornada,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        match_date,
        match_time,
        status,
        venue,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .eq('league_id', leagueId)
      .eq('match_date', today)
      .order('match_time', { ascending: true });

    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get today's matches: ${error.message}`);
    }

    const matches: MatchData[] = (data || []).map((match: any) => ({
      id: match.id,
      jornada: match.jornada,
      homeTeam: match.home_team?.name || 'Unknown',
      awayTeam: match.away_team?.name || 'Unknown',
      homeScore: match.home_score,
      awayScore: match.away_score,
      matchDate: match.match_date,
      matchTime: match.match_time,
      status: match.status,
      venue: match.venue,
    }));

    const executionTime = Date.now() - startTime;

    return {
      data: matches,
      query: {
        query: `SELECT matches WHERE league_id = '${leagueId}' AND match_date = '${today}'`,
        resultCount: matches.length,
        executionTimeMs: executionTime,
      },
      executionTime,
    };
  }

  /**
   * Obtiene resultados de partidos terminados
   *
   * @param leagueId - ID de la liga
   * @param options - Opciones de filtrado
   * @returns Resultados de partidos
   */
  static async getMatchResults(
    leagueId: string,
    options: {
      jornada?: number;
      teamName?: string;
      limit?: number;
      tournamentId?: string;
    } = {}
  ): Promise<SQLQueryResult<MatchData>> {
    const startTime = Date.now();
    const supabase = await createServerSupabaseClient();

    const { jornada, teamName, limit = 10, tournamentId } = options;

    console.log(`🏆 SQL: Getting match results, league ${leagueId}`);

    let query = supabase
      .from('matches')
      .select(`
        id,
        jornada,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        match_date,
        match_time,
        status,
        venue,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .eq('league_id', leagueId)
      .eq('status', 'finished')
      .order('match_date', { ascending: false })
      .limit(limit);

    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId);
    }

    if (jornada) {
      query = query.eq('jornada', jornada);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get match results: ${error.message}`);
    }

    let matches: MatchData[] = (data || []).map((match: any) => ({
      id: match.id,
      jornada: match.jornada,
      homeTeam: match.home_team?.name || 'Unknown',
      awayTeam: match.away_team?.name || 'Unknown',
      homeScore: match.home_score,
      awayScore: match.away_score,
      matchDate: match.match_date,
      matchTime: match.match_time,
      status: match.status,
      venue: match.venue,
    }));

    // Filtrar por equipo si se especificó
    if (teamName) {
      const normalizedTeamName = teamName.toLowerCase();
      matches = matches.filter(
        (m) =>
          m.homeTeam.toLowerCase().includes(normalizedTeamName) ||
          m.awayTeam.toLowerCase().includes(normalizedTeamName)
      );
    }

    const executionTime = Date.now() - startTime;

    return {
      data: matches,
      query: {
        query: `SELECT matches WHERE league_id = '${leagueId}' AND status = 'finished'`,
        resultCount: matches.length,
        executionTimeMs: executionTime,
      },
      executionTime,
    };
  }

  /**
   * Obtiene la tabla de posiciones
   *
   * @param leagueId - ID de la liga
   * @param tournamentId - ID del torneo
   * @returns Tabla de posiciones ordenada
   */
  static async getStandings(
    leagueId: string,
    tournamentId: string
  ): Promise<SQLQueryResult<StandingData>> {
    const startTime = Date.now();
    const supabase = await createServerSupabaseClient();

    console.log(`📊 SQL: Getting standings, league ${leagueId}, tournament ${tournamentId}`);

    // Usar función RPC para generar tabla de posiciones
    // @ts-expect-error - Supabase type inference issue without generated types
    const { data, error } = await supabase.rpc('generate_standings', {
      p_league_id: leagueId,
      p_tournament_id: tournamentId,
    });

    if (error) {
      // Si la función no existe, calcular manualmente
      console.warn('⚠️ generate_standings RPC not found, calculating manually');
      return this.calculateStandingsManually(leagueId, tournamentId);
    }

    const rawData = data as any;
    const standings: StandingData[] = (rawData || []).map((row: any, index: number) => ({
      position: index + 1,
      teamName: row.team_name,
      teamId: row.team_id,
      played: row.played || 0,
      won: row.won || 0,
      drawn: row.drawn || 0,
      lost: row.lost || 0,
      goalsFor: row.goals_for || 0,
      goalsAgainst: row.goals_against || 0,
      goalDifference: row.goal_difference || 0,
      points: row.points || 0,
    }));

    const executionTime = Date.now() - startTime;

    console.log(`✅ SQL: Generated standings for ${standings.length} teams (${executionTime}ms)`);

    return {
      data: standings,
      query: {
        query: `CALL generate_standings('${leagueId}', '${tournamentId}')`,
        resultCount: standings.length,
        executionTimeMs: executionTime,
      },
      executionTime,
    };
  }

  /**
   * Calcula tabla de posiciones manualmente si no existe la función RPC
   */
  private static async calculateStandingsManually(
    leagueId: string,
    tournamentId: string
  ): Promise<SQLQueryResult<StandingData>> {
    const startTime = Date.now();
    const supabase = await createServerSupabaseClient();

    // Obtener todos los partidos terminados
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name)
      `)
      .eq('league_id', leagueId)
      .eq('tournament_id', tournamentId)
      .eq('status', 'finished');

    if (error) {
      throw new Error(`Failed to calculate standings: ${error.message}`);
    }

    // Calcular estadísticas por equipo
    const teamStats: Record<string, StandingData> = {};

    (matches || []).forEach((match: any) => {
      const homeTeamId = match.home_team_id;
      const awayTeamId = match.away_team_id;
      const homeScore = match.home_score || 0;
      const awayScore = match.away_score || 0;

      // Inicializar equipos si no existen
      if (!teamStats[homeTeamId]) {
        teamStats[homeTeamId] = {
          position: 0,
          teamName: match.home_team?.name || 'Unknown',
          teamId: homeTeamId,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        };
      }
      if (!teamStats[awayTeamId]) {
        teamStats[awayTeamId] = {
          position: 0,
          teamName: match.away_team?.name || 'Unknown',
          teamId: awayTeamId,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        };
      }

      // Actualizar estadísticas
      teamStats[homeTeamId].played++;
      teamStats[awayTeamId].played++;
      teamStats[homeTeamId].goalsFor += homeScore;
      teamStats[homeTeamId].goalsAgainst += awayScore;
      teamStats[awayTeamId].goalsFor += awayScore;
      teamStats[awayTeamId].goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        teamStats[homeTeamId].won++;
        teamStats[homeTeamId].points += 3;
        teamStats[awayTeamId].lost++;
      } else if (homeScore < awayScore) {
        teamStats[awayTeamId].won++;
        teamStats[awayTeamId].points += 3;
        teamStats[homeTeamId].lost++;
      } else {
        teamStats[homeTeamId].drawn++;
        teamStats[awayTeamId].drawn++;
        teamStats[homeTeamId].points += 1;
        teamStats[awayTeamId].points += 1;
      }

      teamStats[homeTeamId].goalDifference =
        teamStats[homeTeamId].goalsFor - teamStats[homeTeamId].goalsAgainst;
      teamStats[awayTeamId].goalDifference =
        teamStats[awayTeamId].goalsFor - teamStats[awayTeamId].goalsAgainst;
    });

    // Ordenar por puntos, diferencia de goles, goles a favor
    const standings = Object.values(teamStats).sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference)
        return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    // Asignar posiciones
    standings.forEach((team, index) => {
      team.position = index + 1;
    });

    const executionTime = Date.now() - startTime;

    return {
      data: standings,
      query: {
        query: `Manual standings calculation for league ${leagueId}`,
        resultCount: standings.length,
        executionTimeMs: executionTime,
      },
      executionTime,
    };
  }

  /**
   * Obtiene jugadores suspendidos
   *
   * @param leagueId - ID de la liga
   * @param tournamentId - ID del torneo (opcional)
   * @returns Lista de jugadores suspendidos
   */
  static async getSuspendedPlayers(
    leagueId: string,
    tournamentId?: string
  ): Promise<SQLQueryResult<SuspensionData>> {
    const startTime = Date.now();
    const supabase = await createServerSupabaseClient();

    console.log(`⚠️ SQL: Getting suspended players, league ${leagueId}`);

    let query = supabase
      .from('player_suspensions')
      .select(`
        id,
        player_id,
        reason,
        suspended_until,
        player:players(id, name, team:teams(name)),
        tournament_id
      `)
      .eq('league_id', leagueId)
      .eq('is_active', true)
      .order('suspended_until', { ascending: true });

    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get suspended players: ${error.message}`);
    }

    const suspensions: SuspensionData[] = (data || []).map((suspension: any) => ({
      playerId: suspension.player?.id || '',
      playerName: suspension.player?.name || 'Unknown',
      teamName: suspension.player?.team?.name || 'Unknown',
      yellowCards: 0, // Se obtiene de player_stats
      redCards: 0,
      suspendedUntil: suspension.suspended_until,
      reason: suspension.reason,
    }));

    const executionTime = Date.now() - startTime;

    console.log(`✅ SQL: Found ${suspensions.length} suspended players (${executionTime}ms)`);

    return {
      data: suspensions,
      query: {
        query: `SELECT player_suspensions WHERE league_id = '${leagueId}'`,
        resultCount: suspensions.length,
        executionTimeMs: executionTime,
      },
      executionTime,
    };
  }

  /**
   * Obtiene estadísticas de goleadores
   *
   * @param leagueId - ID de la liga
   * @param tournamentId - ID del torneo
   * @param limit - Número máximo de jugadores
   * @returns Top goleadores
   */
  static async getTopScorers(
    leagueId: string,
    tournamentId: string,
    limit: number = 10
  ): Promise<SQLQueryResult<PlayerStatsData>> {
    const startTime = Date.now();
    const supabase = await createServerSupabaseClient();

    console.log(`⚽ SQL: Getting top scorers, league ${leagueId}`);

    const { data, error } = await supabase
      .from('player_stats')
      .select(`
        player_id,
        goals,
        assists,
        yellow_cards,
        red_cards,
        matches_played,
        player:players(id, name, team:teams(name))
      `)
      .eq('league_id', leagueId)
      .eq('tournament_id', tournamentId)
      .gt('goals', 0)
      .order('goals', { ascending: false })
      .order('assists', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get top scorers: ${error.message}`);
    }

    const scorers: PlayerStatsData[] = (data || []).map((stat: any) => ({
      playerId: stat.player?.id || '',
      playerName: stat.player?.name || 'Unknown',
      teamName: stat.player?.team?.name || 'Unknown',
      goals: stat.goals || 0,
      assists: stat.assists || 0,
      yellowCards: stat.yellow_cards || 0,
      redCards: stat.red_cards || 0,
      matchesPlayed: stat.matches_played || 0,
    }));

    const executionTime = Date.now() - startTime;

    return {
      data: scorers,
      query: {
        query: `SELECT player_stats WHERE league_id = '${leagueId}' ORDER BY goals DESC LIMIT ${limit}`,
        resultCount: scorers.length,
        executionTimeMs: executionTime,
      },
      executionTime,
    };
  }

  /**
   * Obtiene próximos partidos de un equipo
   *
   * @param teamName - Nombre del equipo (normalizado)
   * @param leagueId - ID de la liga
   * @param limit - Número de partidos
   * @returns Próximos partidos del equipo
   */
  static async getTeamUpcomingMatches(
    teamName: string,
    leagueId: string,
    limit: number = 5
  ): Promise<SQLQueryResult<MatchData>> {
    const startTime = Date.now();
    const supabase = await createServerSupabaseClient();

    console.log(`🔜 SQL: Getting upcoming matches for team "${teamName}"`);

    // Primero buscar el equipo por nombre
    const { data: teams, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('league_id', leagueId)
      .ilike('name', `%${teamName}%`)
      .limit(1);

    if (teamError || !teams || teams.length === 0) {
      return {
        data: [],
        query: {
          query: `No team found matching "${teamName}"`,
          resultCount: 0,
          executionTimeMs: Date.now() - startTime,
        },
        executionTime: Date.now() - startTime,
      };
    }

    const teamsData = teams as any;
    const teamId = teamsData[0].id;

    // Obtener próximos partidos
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        jornada,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        match_date,
        match_time,
        status,
        venue,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .eq('league_id', leagueId)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .in('status', ['scheduled', 'in_progress'])
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get team upcoming matches: ${error.message}`);
    }

    const matches: MatchData[] = (data || []).map((match: any) => ({
      id: match.id,
      jornada: match.jornada,
      homeTeam: match.home_team?.name || 'Unknown',
      awayTeam: match.away_team?.name || 'Unknown',
      homeScore: match.home_score,
      awayScore: match.away_score,
      matchDate: match.match_date,
      matchTime: match.match_time,
      status: match.status,
      venue: match.venue,
    }));

    const executionTime = Date.now() - startTime;

    return {
      data: matches,
      query: {
        query: `SELECT matches WHERE (home_team_id = '${teamId}' OR away_team_id = '${teamId}') AND status IN ('scheduled', 'in_progress')`,
        resultCount: matches.length,
        executionTimeMs: executionTime,
      },
      executionTime,
    };
  }

  /**
   * Formatea resultados SQL para usar en prompt de LLM
   *
   * @param matches - Lista de partidos
   * @returns String formateado para LLM
   */
  static formatMatchesForLLM(matches: MatchData[]): string {
    if (matches.length === 0) {
      return 'No se encontraron partidos.';
    }

    let formatted = '';

    matches.forEach((match) => {
      if (match.status === 'finished') {
        formatted += `Jornada ${match.jornada}: ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam} (${match.matchDate})\n`;
      } else {
        formatted += `Jornada ${match.jornada}: ${match.homeTeam} vs ${match.awayTeam} - ${match.matchDate}`;
        if (match.matchTime) {
          formatted += ` a las ${match.matchTime}`;
        }
        formatted += '\n';
      }
    });

    return formatted;
  }

  /**
   * Formatea tabla de posiciones para LLM
   *
   * @param standings - Tabla de posiciones
   * @returns String formateado
   */
  static formatStandingsForLLM(standings: StandingData[]): string {
    if (standings.length === 0) {
      return 'No hay tabla de posiciones disponible.';
    }

    let formatted = 'Tabla de Posiciones:\n\n';
    formatted += 'Pos | Equipo | PJ | G | E | P | GF | GC | DG | Pts\n';
    formatted += '--- | ------ | -- | - | - | - | -- | -- | -- | ---\n';

    standings.forEach((team) => {
      formatted += `${team.position} | ${team.teamName} | ${team.played} | ${team.won} | ${team.drawn} | ${team.lost} | ${team.goalsFor} | ${team.goalsAgainst} | ${team.goalDifference > 0 ? '+' : ''}${team.goalDifference} | ${team.points}\n`;
    });

    return formatted;
  }

  /**
   * Formatea goleadores para LLM
   *
   * @param scorers - Lista de goleadores
   * @returns String formateado
   */
  static formatScorersForLLM(scorers: PlayerStatsData[]): string {
    if (scorers.length === 0) {
      return 'No hay estadísticas de goleadores disponibles.';
    }

    let formatted = 'Tabla de Goleadores:\n\n';

    scorers.forEach((scorer, index) => {
      formatted += `${index + 1}. ${scorer.playerName} (${scorer.teamName}) - ${scorer.goals} goles`;
      if (scorer.assists > 0) {
        formatted += `, ${scorer.assists} asistencias`;
      }
      formatted += '\n';
    });

    return formatted;
  }
}
