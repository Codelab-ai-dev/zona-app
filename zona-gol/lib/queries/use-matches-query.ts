"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { queryKeys } from "./query-keys"
import { Database } from "@/lib/supabase/database.types"

type Match = Database["public"]["Tables"]["matches"]["Row"]

// Tipo extendido con relaciones
type MatchWithTeams = Match & {
  home_team?: { id: string; name: string; slug: string; logo: string | null } | null
  away_team?: { id: string; name: string; slug: string; logo: string | null } | null
  tournament?: { id: string; name: string } | null
}

/**
 * Hook para obtener partidos de un torneo
 */
export function useMatchesByTournament(tournamentId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.matches.byTournament(tournamentId || ""),
    queryFn: async (): Promise<MatchWithTeams[]> => {
      if (!tournamentId) return []

      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, slug, logo),
          away_team:teams!matches_away_team_id_fkey(id, name, slug, logo),
          tournament:tournaments(id, name)
        `)
        .eq("tournament_id", tournamentId)
        .order("round", { ascending: true })
        .order("match_date", { ascending: true })
        .limit(200)

      if (error) throw error
      return (data as MatchWithTeams[]) || []
    },
    enabled: !!tournamentId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  })
}

/**
 * Hook para obtener partidos de un equipo
 */
export function useMatchesByTeam(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.matches.byTeam(teamId || ""),
    queryFn: async (): Promise<MatchWithTeams[]> => {
      if (!teamId) return []

      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, slug, logo),
          away_team:teams!matches_away_team_id_fkey(id, name, slug, logo),
          tournament:tournaments(id, name)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order("match_date", { ascending: false })
        .limit(50)

      if (error) throw error
      return (data as MatchWithTeams[]) || []
    },
    enabled: !!teamId,
  })
}

/**
 * Hook para obtener próximos partidos de un torneo
 */
export function useUpcomingMatches(tournamentId: string | undefined, limit = 10) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: [...queryKeys.matches.upcoming(tournamentId || ""), limit],
    queryFn: async (): Promise<MatchWithTeams[]> => {
      if (!tournamentId) return []

      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, slug, logo),
          away_team:teams!matches_away_team_id_fkey(id, name, slug, logo)
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "scheduled")
        .gte("match_date", now)
        .order("match_date", { ascending: true })
        .limit(limit)

      if (error) throw error
      return (data as MatchWithTeams[]) || []
    },
    enabled: !!tournamentId,
    staleTime: 2 * 60 * 1000, // 2 minutos - próximos partidos cambian más frecuentemente
  })
}

// Tipo para partidos pendientes con relaciones
type PendingMatch = {
  id: string
  match_date: string
  match_time: string | null
  status: string
  home_score: number | null
  away_score: number | null
  round: number | null
  tournament_id?: string
  home_teams: { id: string; name: string; logo?: string | null }
  away_teams: { id: string; name: string; logo?: string | null }
  tournaments: { name: string; league_id?: string }
}

/**
 * Hook para obtener partidos pendientes (scheduled/in_progress) de una liga
 * Usado en el tab de Resultados
 */
export function usePendingMatchesByLeague(leagueId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.matches.pendingByLeague(leagueId || ""),
    queryFn: async (): Promise<PendingMatch[]> => {
      if (!leagueId) return []

      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          match_date,
          match_time,
          status,
          home_score,
          away_score,
          round,
          tournament_id,
          home_teams:teams!matches_home_team_id_fkey(id, name, logo),
          away_teams:teams!matches_away_team_id_fkey(id, name, logo),
          tournaments!inner(
            name,
            league_id
          )
        `)
        .eq('tournaments.league_id', leagueId)
        .in('status', ['scheduled', 'in_progress'])
        .order('match_date')
        .order('match_time')
        .limit(50)

      if (error) throw error
      return (data as PendingMatch[]) || []
    },
    enabled: !!leagueId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  })
}

/**
 * Hook para obtener un partido por ID
 */
export function useMatchById(matchId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.matches.detail(matchId || ""),
    queryFn: async (): Promise<MatchWithTeams | null> => {
      if (!matchId) return null

      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, slug, logo),
          away_team:teams!matches_away_team_id_fkey(id, name, slug, logo),
          tournament:tournaments(id, name)
        `)
        .eq("id", matchId)
        .single()

      if (error) throw error
      return data as MatchWithTeams
    },
    enabled: !!matchId,
  })
}

/**
 * Mutation para actualizar resultado de partido
 */
export function useUpdateMatchResult() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({
      matchId,
      homeScore,
      awayScore,
    }: {
      matchId: string
      homeScore: number
      awayScore: number
    }) => {
      const { data, error } = await supabase
        .from("matches")
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: "finished",
        })
        .eq("id", matchId)
        .select()
        .single()

      if (error) throw error
      return data as Match
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(data.id) })
      if (data.tournament_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.matches.byTournament(data.tournament_id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.standings(data.tournament_id) })
      }
      if (data.home_team_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.matches.byTeam(data.home_team_id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.stats(data.home_team_id) })
      }
      if (data.away_team_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.matches.byTeam(data.away_team_id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.stats(data.away_team_id) })
      }
    },
  })
}

/**
 * Hook para invalidar el cache de partidos manualmente
 */
export function useInvalidateMatches() {
  const queryClient = useQueryClient()

  return {
    invalidateByTournament: (tournamentId: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.matches.byTournament(tournamentId)
      })
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.matches.all
      })
    }
  }
}
