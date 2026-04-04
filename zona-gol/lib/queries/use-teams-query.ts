"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { queryKeys } from "./query-keys"
import { Database } from "@/lib/supabase/database.types"

type Team = Database["public"]["Tables"]["teams"]["Row"]
type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"]
type TeamUpdate = Database["public"]["Tables"]["teams"]["Update"]

// Tipos extendidos con relaciones
type TeamWithRelations = Team & {
  owner?: { id: string; name: string; email: string } | null
  tournament?: { id: string; name: string } | null
}

/**
 * Hook para obtener equipos de una liga
 * Usa JOINs para traer owner y tournament en una sola query
 */
export function useTeamsByLeague(leagueId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.teams.byLeague(leagueId || ""),
    queryFn: async (): Promise<TeamWithRelations[]> => {
      if (!leagueId) return []

      const { data, error } = await supabase
        .from("teams")
        .select(`
          id, name, slug, logo, description, owner_id, league_id, tournament_id, is_active, created_at, updated_at,
          owner:users!teams_owner_id_fkey(id, name, email, phone),
          tournament:tournaments(id, name)
        `)
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return (data as TeamWithRelations[]) || []
    },
    enabled: !!leagueId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para obtener equipos del owner actual
 */
export function useTeamsByOwner(userId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.teams.byOwner(),
    queryFn: async (): Promise<Team[]> => {
      if (!userId) return []

      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos en cache
  })
}

/**
 * Hook para obtener un equipo por ID
 */
export function useTeamById(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.teams.detail(teamId || ""),
    queryFn: async (): Promise<TeamWithRelations | null> => {
      if (!teamId) return null

      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          owner:users!teams_owner_id_fkey(id, name, email),
          tournament:tournaments(id, name)
        `)
        .eq("id", teamId)
        .single()

      if (error) throw error
      return data as TeamWithRelations
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos en cache
  })
}

/**
 * Hook para obtener estadísticas de un equipo
 * Optimizado: usa Promise.all para paralelizar queries
 */
export function useTeamStats(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.teams.stats(teamId || ""),
    queryFn: async () => {
      if (!teamId) return null

      // Paralelizar todas las queries
      const [playersResult, matchesResult] = await Promise.all([
        supabase
          .from("players")
          .select("id", { count: "exact", head: true })
          .eq("team_id", teamId)
          .eq("is_active", true),
        supabase
          .from("matches")
          .select("home_team_id, away_team_id, home_score, away_score, status")
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .eq("status", "finished")
          .limit(100), // Limitar a últimos 100 partidos
      ])

      const playersCount = playersResult.count || 0
      const matches = matchesResult.data || []

      // Calcular estadísticas
      let wins = 0, losses = 0, draws = 0, goalsFor = 0, goalsAgainst = 0

      matches.forEach((match) => {
        if (match.home_score === null || match.away_score === null) return

        const isHome = match.home_team_id === teamId
        const teamScore = isHome ? match.home_score : match.away_score
        const opponentScore = isHome ? match.away_score : match.home_score

        goalsFor += teamScore
        goalsAgainst += opponentScore

        if (teamScore > opponentScore) wins++
        else if (teamScore < opponentScore) losses++
        else draws++
      })

      return {
        playersCount,
        matchesCount: matches.length,
        wins,
        losses,
        draws,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        points: wins * 3 + draws,
      }
    },
    enabled: !!teamId,
    staleTime: 10 * 60 * 1000, // 10 minutos - stats no cambian tan frecuente
  })
}

/**
 * Mutation para crear equipo
 */
export function useCreateTeam() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async (teamData: TeamInsert) => {
      const { data, error } = await supabase
        .from("teams")
        .insert(teamData)
        .select(`
          *,
          owner:users!teams_owner_id_fkey(id, name, email),
          tournament:tournaments(id, name)
        `)
        .single()

      if (error) throw error
      return data as TeamWithRelations
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      if (data.league_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.byLeague(data.league_id) })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.byOwner() })
    },
  })
}

/**
 * Mutation para actualizar equipo
 */
export function useUpdateTeam() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({ teamId, updates }: { teamId: string; updates: TeamUpdate }) => {
      const { data, error } = await supabase
        .from("teams")
        .update(updates)
        .eq("id", teamId)
        .select(`
          *,
          owner:users!teams_owner_id_fkey(id, name, email, phone),
          tournament:tournaments(id, name)
        `)
        .single()

      if (error) throw error
      return data as TeamWithRelations
    },
    onSuccess: (data) => {
      // Actualizar caché
      queryClient.setQueryData(queryKeys.teams.detail(data.id), data)
      if (data.league_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.byLeague(data.league_id),
          refetchType: 'all',
        })
      }
    },
  })
}

/**
 * Mutation para eliminar equipo
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", teamId)
      if (error) throw error
      return teamId
    },
    onSuccess: () => {
      // Invalidar todas las queries de teams
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

// Tipo para estadísticas de equipo (standings)
type TeamStanding = {
  id: string | null
  team_id: string
  tournament_id: string
  matches_played: number
  matches_won: number
  matches_drawn: number
  matches_lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  points_adjustment: number
  adjustment_reason: string | null
  team: {
    id: string
    name: string
    logo: string | null
  }
}

/**
 * Hook para obtener tabla de posiciones de un torneo
 * Primero busca en team_stats, si no existe calcula desde matches
 */
export function useTeamStatsByTournament(tournamentId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.teamStats.byTournament(tournamentId || ""),
    queryFn: async (): Promise<TeamStanding[]> => {
      if (!tournamentId) return []

      // First check if team_stats exists for this tournament
      const { data: existingStats, error: statsError } = await supabase
        .from('team_stats')
        .select(`
          id,
          team_id,
          tournament_id,
          matches_played,
          matches_won,
          matches_drawn,
          matches_lost,
          goals_for,
          goals_against,
          goal_difference,
          points,
          points_adjustment,
          adjustment_reason,
          team:teams(id, name, logo)
        `)
        .eq('tournament_id', tournamentId)
        .order('points', { ascending: false })

      if (statsError) throw statsError

      if (existingStats && existingStats.length > 0) {
        // Use existing stats
        const formattedStandings = existingStats.map((stat: any) => ({
          ...stat,
          points_adjustment: stat.points_adjustment || 0,
          adjustment_reason: stat.adjustment_reason || null,
          team: stat.team
        }))

        // Sort by total points (points + adjustment)
        formattedStandings.sort((a: any, b: any) => {
          const totalA = a.points + (a.points_adjustment || 0)
          const totalB = b.points + (b.points_adjustment || 0)
          if (totalB !== totalA) return totalB - totalA
          if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
          return b.goals_for - a.goals_for
        })

        return formattedStandings
      }

      // Calculate from matches if no team_stats exist
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, logo')
        .eq('tournament_id', tournamentId)
        .eq('is_active', true)

      const { data: matches } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id, home_score, away_score, status')
        .eq('tournament_id', tournamentId)
        .eq('status', 'finished')

      // Calculate standings
      const standingsMap: Record<string, TeamStanding> = {}

      teams?.forEach(team => {
        standingsMap[team.id] = {
          id: null,
          team_id: team.id,
          tournament_id: tournamentId,
          matches_played: 0,
          matches_won: 0,
          matches_drawn: 0,
          matches_lost: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
          points_adjustment: 0,
          adjustment_reason: null,
          team
        }
      })

      matches?.forEach(match => {
        if (match.home_score !== null && match.away_score !== null) {
          const homeId = match.home_team_id
          const awayId = match.away_team_id

          if (standingsMap[homeId]) {
            standingsMap[homeId].matches_played++
            standingsMap[homeId].goals_for += match.home_score
            standingsMap[homeId].goals_against += match.away_score

            if (match.home_score > match.away_score) {
              standingsMap[homeId].matches_won++
            } else if (match.home_score < match.away_score) {
              standingsMap[homeId].matches_lost++
            } else {
              standingsMap[homeId].matches_drawn++
            }
          }

          if (standingsMap[awayId]) {
            standingsMap[awayId].matches_played++
            standingsMap[awayId].goals_for += match.away_score
            standingsMap[awayId].goals_against += match.home_score

            if (match.away_score > match.home_score) {
              standingsMap[awayId].matches_won++
            } else if (match.away_score < match.home_score) {
              standingsMap[awayId].matches_lost++
            } else {
              standingsMap[awayId].matches_drawn++
            }
          }
        }
      })

      // Calculate points and goal difference
      Object.values(standingsMap).forEach((team) => {
        team.points = team.matches_won * 3 + team.matches_drawn
        team.goal_difference = team.goals_for - team.goals_against
      })

      const calculatedStandings = Object.values(standingsMap).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
        return b.goals_for - a.goals_for
      })

      return calculatedStandings
    },
    enabled: !!tournamentId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  })
}

/**
 * Hook para invalidar el cache de team stats
 */
export function useInvalidateTeamStats() {
  const queryClient = useQueryClient()

  return {
    invalidateByTournament: (tournamentId: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.teamStats.byTournament(tournamentId)
      })
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.teamStats.all
      })
    }
  }
}

// Tipo para el resumen completo del team owner
type TeamOwnerSummary = {
  team: TeamWithRelations | null
  players: Array<{
    id: string
    name: string
    jersey_number: number | null
    position: string | null
    photo: string | null
    is_active: boolean
    total_goals: number
    total_assists: number
    total_yellow_cards: number
    total_red_cards: number
    total_minutes_played: number
    matches_played: number
  }>
  matches: Array<{
    id: string
    match_date: string
    status: string
    round: number | null
    home_score: number | null
    away_score: number | null
    home_team_id: string
    away_team_id: string
    home_team?: { id: string; name: string; logo: string | null } | null
    away_team?: { id: string; name: string; logo: string | null } | null
  }>
  stats: {
    playersCount: number
    matchesCount: number
    wins: number
    losses: number
    draws: number
  }
  suspensions: Array<{
    id: string
    player_id: string
    player_name: string
    jersey_number: number
    suspension_type: string
    reason: string
    matches_to_serve: number
    matches_served: number
  }>
}

/**
 * Hook COMBINADO para cargar TODO el resumen del team owner
 * ULTRA-OPTIMIZADO: Queries directas sin RPC, sin stats pesadas inicialmente
 */
export function useTeamOwnerSummary(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: [...queryKeys.teams.all, 'ownerSummary', teamId || ""],
    queryFn: async (): Promise<TeamOwnerSummary> => {
      if (!teamId) {
        return {
          team: null,
          players: [],
          matches: [],
          stats: { playersCount: 0, matchesCount: 0, wins: 0, losses: 0, draws: 0 },
          suspensions: []
        }
      }

      // TODAS las queries en paralelo (SIN columna photo que es lenta)
      const [teamResult, playersResult, matchesResult, suspensionsResult] = await Promise.all([
        // Team
        supabase
          .from('teams')
          .select('id, name, logo, slug')
          .eq('id', teamId)
          .single(),
        // Players - photo ahora es URL (migrado a Storage)
        supabase
          .from('players')
          .select('id, name, jersey_number, position, photo, is_active')
          .eq('team_id', teamId)
          .eq('is_active', true)
          .order('jersey_number', { ascending: true }),
        // Matches - incluir is_published para filtrar en frontend
        supabase
          .from('matches')
          .select('id, match_date, status, round, home_score, away_score, home_team_id, away_team_id, is_published')
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .order('match_date', { ascending: false })
          .limit(20),
        // Suspensions
        supabase
          .from('player_suspensions')
          .select('id, player_id, suspension_type, reason, matches_to_serve, matches_served')
          .eq('team_id', teamId)
          .eq('status', 'active')
      ])

      const team = teamResult.data as TeamWithRelations | null
      const players = playersResult.data || []
      const matches = matchesResult.data || []
      const suspensionsData = suspensionsResult.data || []


      // Obtener nombres de equipos para los matches (query separada pequeña)
      const teamIds = new Set<string>()
      matches.forEach(m => {
        if (m.home_team_id && m.home_team_id !== teamId) teamIds.add(m.home_team_id)
        if (m.away_team_id && m.away_team_id !== teamId) teamIds.add(m.away_team_id)
      })

      let teamsMap = new Map<string, { id: string; name: string; logo: string | null }>()
      if (teamIds.size > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, logo')
          .in('id', Array.from(teamIds))
        teamsData?.forEach(t => teamsMap.set(t.id, t))
      }

      // Agregar team info a matches
      const matchesWithTeams = matches.map(m => ({
        ...m,
        home_team: m.home_team_id === teamId
          ? { id: teamId, name: team?.name || '', logo: team?.logo || null }
          : teamsMap.get(m.home_team_id) || { id: m.home_team_id, name: 'Equipo', logo: null },
        away_team: m.away_team_id === teamId
          ? { id: teamId, name: team?.name || '', logo: team?.logo || null }
          : teamsMap.get(m.away_team_id) || { id: m.away_team_id, name: 'Equipo', logo: null }
      }))

      // Obtener nombres de jugadores suspendidos
      const suspendedPlayerIds = suspensionsData.map(s => s.player_id)
      let suspendedPlayersMap = new Map<string, { name: string; jersey_number: number }>()
      if (suspendedPlayerIds.length > 0) {
        const suspendedPlayers = players.filter(p => suspendedPlayerIds.includes(p.id))
        suspendedPlayers.forEach(p => suspendedPlayersMap.set(p.id, { name: p.name, jersey_number: p.jersey_number || 0 }))
      }

      // Cargar estadísticas de jugadores
      const playerIds = players.map(p => p.id)
      let statsMap = new Map<string, { goals: number; assists: number; yellow_cards: number; red_cards: number; minutes_played: number; matches: number }>()

      if (playerIds.length > 0) {
        const { data: playerStats } = await supabase
          .from('player_stats')
          .select('player_id, goals, assists, yellow_cards, red_cards, minutes_played')
          .in('player_id', playerIds)

        // Agrupar estadísticas por jugador
        ;(playerStats || []).forEach((stat) => {
          if (!statsMap.has(stat.player_id)) {
            statsMap.set(stat.player_id, { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, minutes_played: 0, matches: 0 })
          }
          const current = statsMap.get(stat.player_id)!
          current.goals += stat.goals || 0
          current.assists += stat.assists || 0
          current.yellow_cards += stat.yellow_cards || 0
          current.red_cards += stat.red_cards || 0
          current.minutes_played += stat.minutes_played || 0
          current.matches += 1
        })
      }

      // Combinar jugadores con sus estadísticas
      const playersWithStats = players.map(player => {
        const stats = statsMap.get(player.id)
        return {
          ...player,
          total_goals: stats?.goals || 0,
          total_assists: stats?.assists || 0,
          total_yellow_cards: stats?.yellow_cards || 0,
          total_red_cards: stats?.red_cards || 0,
          total_minutes_played: stats?.minutes_played || 0,
          matches_played: stats?.matches || 0,
        }
      })

      // Calcular stats del equipo
      const finishedMatches = matches.filter(m => m.status === 'finished')
      let wins = 0, losses = 0, draws = 0
      finishedMatches.forEach(match => {
        if (match.home_score === null || match.away_score === null) return
        const isHome = match.home_team_id === teamId
        const teamScore = isHome ? match.home_score : match.away_score
        const opponentScore = isHome ? match.away_score : match.home_score
        if (teamScore > opponentScore) wins++
        else if (teamScore < opponentScore) losses++
        else draws++
      })

      // Formatear suspensiones
      const suspensions = suspensionsData.map((s: any) => ({
        id: s.id,
        player_id: s.player_id,
        player_name: suspendedPlayersMap.get(s.player_id)?.name || 'Desconocido',
        jersey_number: suspendedPlayersMap.get(s.player_id)?.jersey_number || 0,
        suspension_type: s.suspension_type,
        reason: s.reason || '',
        matches_to_serve: s.matches_to_serve,
        matches_served: s.matches_served,
      }))

      return {
        team,
        players: playersWithStats,
        matches: matchesWithTeams as TeamOwnerSummary['matches'],
        stats: {
          playersCount: players.length,
          matchesCount: finishedMatches.length,
          wins,
          losses,
          draws
        },
        suspensions
      }
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// Tipo para estadísticas de equipo del team owner
type TeamOwnerStats = {
  playersCount: number
  matchesCount: number
  wins: number
  losses: number
  draws: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

/**
 * Hook para obtener estadísticas del equipo (para team owner)
 * Calcula wins/losses/draws desde matches
 */
export function useTeamOwnerStats(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.teams.stats(teamId || ""),
    queryFn: async (): Promise<TeamOwnerStats> => {
      if (!teamId) {
        return { playersCount: 0, matchesCount: 0, wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }
      }

      // Parallelizar TODAS las queries
      const [playersResult, matchesResult] = await Promise.all([
        supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', teamId)
          .eq('is_active', true),
        supabase
          .from('matches')
          .select('home_team_id, away_team_id, home_score, away_score')
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .eq('status', 'finished')
      ])

      const playersCount = playersResult.count || 0
      const matches = matchesResult.data || []

      let wins = 0, losses = 0, draws = 0, goalsFor = 0, goalsAgainst = 0

      matches.forEach(match => {
        if (match.home_score === null || match.away_score === null) return
        const isHome = match.home_team_id === teamId
        const teamScore = isHome ? match.home_score : match.away_score
        const opponentScore = isHome ? match.away_score : match.home_score

        goalsFor += teamScore
        goalsAgainst += opponentScore

        if (teamScore > opponentScore) wins++
        else if (teamScore < opponentScore) losses++
        else draws++
      })

      return {
        playersCount,
        matchesCount: matches.length,
        wins,
        losses,
        draws,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        points: (wins * 3) + draws
      }
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
  })
}

// Tipo para suspensión
type TeamSuspension = {
  id: string
  player_id: string
  player_name: string
  jersey_number: number
  suspension_type: string
  reason: string
  matches_to_serve: number
  matches_served: number
  status: string
  created_at: string
}

/**
 * Hook para obtener suspensiones activas del equipo
 */
export function useTeamSuspensions(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: [...queryKeys.teams.all, 'suspensions', teamId || ""],
    queryFn: async (): Promise<TeamSuspension[]> => {
      if (!teamId) return []

      const { data, error } = await supabase
        .from('player_suspensions')
        .select(`
          id,
          player_id,
          suspension_type,
          reason,
          matches_to_serve,
          matches_served,
          status,
          created_at,
          player:players(name, jersey_number)
        `)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((s: any) => ({
        id: s.id,
        player_id: s.player_id,
        player_name: s.player?.name || 'Desconocido',
        jersey_number: s.player?.jersey_number || 0,
        suspension_type: s.suspension_type,
        reason: s.reason,
        matches_to_serve: s.matches_to_serve,
        matches_served: s.matches_served,
        status: s.status,
        created_at: s.created_at,
      }))
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000,
  })
}

// ==========================================
// COACHING STAFF HOOKS
// ==========================================

type CoachingStaff = Database["public"]["Tables"]["coaching_staff"]["Row"]
type CoachingStaffInsert = Database["public"]["Tables"]["coaching_staff"]["Insert"]
type CoachingStaffUpdate = Database["public"]["Tables"]["coaching_staff"]["Update"]

type CoachingStaffWithLimits = {
  staff: CoachingStaff[]
  maxLimit: number | null
  registrationOpen: boolean
}

/**
 * Hook para obtener cuerpo técnico de un equipo
 */
export function useCoachingStaff(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.coachingStaff.byTeam(teamId || ""),
    queryFn: async (): Promise<CoachingStaffWithLimits> => {
      if (!teamId) return { staff: [], maxLimit: null, registrationOpen: true }

      // Parallelizar queries
      const [staffResult, teamResult] = await Promise.all([
        supabase
          .from("coaching_staff")
          .select("*")
          .eq("team_id", teamId)
          .order("created_at", { ascending: false }),
        supabase
          .from("teams")
          .select("tournament_id")
          .eq("id", teamId)
          .single()
      ])

      if (staffResult.error) throw staffResult.error

      let maxLimit: number | null = null
      let registrationOpen = true

      // Si tiene torneo, obtener límites
      if (teamResult.data?.tournament_id) {
        const { data: tournament } = await supabase
          .from("tournaments")
          .select("max_coaching_staff, registration_open")
          .eq("id", teamResult.data.tournament_id)
          .single()

        if (tournament) {
          maxLimit = tournament.max_coaching_staff || 10
          registrationOpen = tournament.registration_open
        }
      }

      return {
        staff: staffResult.data || [],
        maxLimit,
        registrationOpen
      }
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Mutation para crear miembro del cuerpo técnico
 */
export function useCreateCoachingStaff() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async (data: CoachingStaffInsert) => {
      const { data: result, error } = await supabase
        .from("coaching_staff")
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coachingStaff.byTeam(data.team_id) })
    },
  })
}

/**
 * Mutation para actualizar miembro del cuerpo técnico
 */
export function useUpdateCoachingStaff() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({ id, updates, teamId }: { id: string; updates: CoachingStaffUpdate; teamId: string }) => {
      const { data, error } = await supabase
        .from("coaching_staff")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return { ...data, teamId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coachingStaff.byTeam(data.teamId) })
    },
  })
}

/**
 * Mutation para eliminar miembro del cuerpo técnico
 */
export function useDeleteCoachingStaff() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase.from("coaching_staff").delete().eq("id", id)
      if (error) throw error
      return { id, teamId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coachingStaff.byTeam(data.teamId) })
    },
  })
}

// ==========================================
// TEAM SCORERS HOOK
// ==========================================

type TeamScorer = {
  id: string
  name: string
  jersey_number: number
  position: string | null
  photo: string | null
  goals: number
  assists: number
}

/**
 * Hook para obtener goleadores del equipo
 */
export function useTeamScorers(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: [...queryKeys.players.all, 'scorers', teamId || ""],
    queryFn: async (): Promise<TeamScorer[]> => {
      if (!teamId) return []

      // Query player_stats through players relation to filter by team_id
      const { data, error } = await supabase
        .from("player_stats")
        .select(`
          player_id,
          goals,
          assists,
          match_id,
          player:players!inner(
            id,
            name,
            jersey_number,
            position,
            photo,
            is_active,
            team_id
          )
        `)
        .eq("player.team_id", teamId)

      if (error) throw error

      // Agrupar por jugador y sumar goles
      const scorersMap = new Map<string, TeamScorer>()

      data?.forEach((stat: any) => {
        if (!stat.player || !stat.player.is_active) return

        const playerId = stat.player.id
        const existing = scorersMap.get(playerId)

        if (existing) {
          existing.goals += stat.goals || 0
          existing.assists += stat.assists || 0
        } else {
          scorersMap.set(playerId, {
            id: stat.player.id,
            name: stat.player.name,
            jersey_number: stat.player.jersey_number || 0,
            position: stat.player.position,
            photo: stat.player.photo,
            goals: stat.goals || 0,
            assists: stat.assists || 0,
          })
        }
      })

      // Ordenar por goles
      return Array.from(scorersMap.values())
        .filter(s => s.goals > 0 || s.assists > 0)
        .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  })
}

// ==========================================
// PLAYERS HOOKS (para player-management)
// ==========================================

type Player = Database["public"]["Tables"]["players"]["Row"]
type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"]
type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"]

type PlayersWithLimits = {
  players: Player[]
  maxLimit: number | null
  registrationOpen: boolean
  tournamentId: string | null
}

/**
 * Hook para obtener jugadores de un equipo con límites del torneo
 */
export function usePlayers(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.players.byTeam(teamId || ""),
    queryFn: async (): Promise<PlayersWithLimits> => {
      if (!teamId) return { players: [], maxLimit: null, registrationOpen: true, tournamentId: null }

      // Parallelizar queries
      const [playersResult, teamResult] = await Promise.all([
        supabase
          .from("players")
          .select("*")
          .eq("team_id", teamId)
          .eq("is_active", true)
          .order("jersey_number", { ascending: true }),
        supabase
          .from("teams")
          .select("tournament_id")
          .eq("id", teamId)
          .single()
      ])

      if (playersResult.error) throw playersResult.error

      let maxLimit: number | null = null
      let registrationOpen = true
      let tournamentId: string | null = teamResult.data?.tournament_id || null

      // Si tiene torneo, obtener límites
      if (tournamentId) {
        const { data: tournament } = await supabase
          .from("tournaments")
          .select("max_players, registration_open")
          .eq("id", tournamentId)
          .single()

        if (tournament) {
          maxLimit = tournament.max_players
          registrationOpen = tournament.registration_open
        }
      }

      return {
        players: playersResult.data || [],
        maxLimit,
        registrationOpen,
        tournamentId
      }
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

/**
 * Mutation para crear jugador
 */
export function useCreatePlayer() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async (data: PlayerInsert) => {
      const { data: result, error } = await supabase
        .from("players")
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.players.byTeam(data.team_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.stats(data.team_id) })
    },
  })
}

/**
 * Mutation para actualizar jugador
 */
export function useUpdatePlayer() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({ id, updates, teamId }: { id: string; updates: PlayerUpdate; teamId: string }) => {
      const { data, error } = await supabase
        .from("players")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return { ...data, teamId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.players.byTeam(data.teamId) })
    },
  })
}

/**
 * Mutation para eliminar jugador
 */
export function useDeletePlayer() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase.from("players").delete().eq("id", id)
      if (error) throw error
      return { id, teamId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.players.byTeam(data.teamId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.stats(data.teamId) })
    },
  })
}

// ==========================================
// TEAM UNIFORMS HOOK
// ==========================================

type TeamUniforms = {
  id: string
  name: string
  primary_color: string | null
  secondary_color: string | null
  third_color: string | null
}

/**
 * Hook para obtener uniformes del equipo
 */
export function useTeamUniforms(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.uniforms.byTeam(teamId || ""),
    queryFn: async (): Promise<TeamUniforms | null> => {
      if (!teamId) return null

      const { data, error } = await supabase
        .from("teams")
        .select("id, name, primary_color, secondary_color, third_color")
        .eq("id", teamId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!teamId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Mutation para actualizar uniformes
 */
export function useUpdateTeamUniforms() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({ teamId, colors }: {
      teamId: string;
      colors: { primary_color?: string; secondary_color?: string; third_color?: string }
    }) => {
      const { data, error } = await supabase
        .from("teams")
        .update(colors)
        .eq("id", teamId)
        .select("id, name, primary_color, secondary_color, third_color")
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.uniforms.byTeam(data.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(data.id) })
    },
  })
}

// ==========================================
// TEAM INFO WITH PLAYER STATS HOOK
// ==========================================

type PlayerWithStats = {
  id: string
  name: string
  jersey_number: number
  position: string
  photo: string | null
  is_active: boolean
  total_games: number
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_minutes_played: number
}

type TeamInfoData = {
  team: TeamWithRelations & {
    league?: { id: string; name: string; slug: string } | null
  }
  playersWithStats: PlayerWithStats[]
}

/**
 * Hook optimizado para obtener info del equipo con estadísticas de jugadores
 * Usa una sola query para obtener todas las stats en vez de N+1 queries
 */
export function useTeamInfo(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: [...queryKeys.teams.all, 'info', teamId || ""],
    queryFn: async (): Promise<TeamInfoData | null> => {
      if (!teamId) return null

      // Ejecutar queries en paralelo
      const [teamResult, playersResult, statsResult] = await Promise.all([
        // Team con relaciones
        supabase
          .from("teams")
          .select(`
            *,
            owner:users!teams_owner_id_fkey(id, name, email),
            league:leagues(id, name, slug)
          `)
          .eq("id", teamId)
          .single(),
        // Jugadores activos
        supabase
          .from("players")
          .select("id, name, jersey_number, position, photo, is_active")
          .eq("team_id", teamId)
          .eq("is_active", true),
        // Todas las stats de jugadores del equipo en una sola query
        supabase
          .from("player_stats")
          .select(`
            player_id,
            goals,
            assists,
            yellow_cards,
            red_cards,
            minutes_played
          `)
          .in("player_id",
            // Subquery para obtener IDs de jugadores del equipo
            (await supabase
              .from("players")
              .select("id")
              .eq("team_id", teamId)
              .eq("is_active", true)
            ).data?.map(p => p.id) || []
          )
      ])

      if (teamResult.error) throw teamResult.error
      if (!teamResult.data) return null

      const players = playersResult.data || []
      const stats = statsResult.data || []

      // Agregar stats por jugador
      const statsMap = new Map<string, {
        games: number
        goals: number
        assists: number
        yellowCards: number
        redCards: number
        minutesPlayed: number
      }>()

      stats.forEach((stat) => {
        const existing = statsMap.get(stat.player_id) || {
          games: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          minutesPlayed: 0,
        }
        statsMap.set(stat.player_id, {
          games: existing.games + 1,
          goals: existing.goals + (stat.goals || 0),
          assists: existing.assists + (stat.assists || 0),
          yellowCards: existing.yellowCards + (stat.yellow_cards || 0),
          redCards: existing.redCards + (stat.red_cards || 0),
          minutesPlayed: existing.minutesPlayed + (stat.minutes_played || 0),
        })
      })

      // Combinar jugadores con sus stats
      const playersWithStats: PlayerWithStats[] = players.map((player) => {
        const playerStats = statsMap.get(player.id) || {
          games: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          minutesPlayed: 0,
        }
        return {
          id: player.id,
          name: player.name,
          jersey_number: player.jersey_number,
          position: player.position,
          photo: player.photo,
          is_active: player.is_active,
          total_games: playerStats.games,
          total_goals: playerStats.goals,
          total_assists: playerStats.assists,
          total_yellow_cards: playerStats.yellowCards,
          total_red_cards: playerStats.redCards,
          total_minutes_played: playerStats.minutesPlayed,
        }
      })

      return {
        team: teamResult.data as TeamInfoData['team'],
        playersWithStats,
      }
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}
