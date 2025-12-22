"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { queryKeys } from "./query-keys"
import { Database } from "@/lib/supabase/database.types"

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"]

/**
 * Hook para obtener torneos de una liga
 */
export function useTournamentsByLeague(leagueId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.tournaments.byLeague(leagueId || ""),
    queryFn: async (): Promise<Tournament[]> => {
      if (!leagueId) return []

      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      return data || []
    },
    enabled: !!leagueId,
    staleTime: 2 * 60 * 1000, // 2 minutos - evita refetches innecesarios
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  })
}

/**
 * Hook para obtener el torneo activo de una liga
 */
export function useActiveTournament(leagueId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: [...queryKeys.tournaments.byLeague(leagueId || ""), "active"],
    queryFn: async (): Promise<Tournament | null> => {
      if (!leagueId) return null

      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("league_id", leagueId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!leagueId,
  })
}

/**
 * Hook para obtener un torneo por ID
 */
export function useTournamentById(tournamentId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.tournaments.detail(tournamentId || ""),
    queryFn: async (): Promise<Tournament | null> => {
      if (!tournamentId) return null

      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!tournamentId,
  })
}

/**
 * Hook para obtener tabla de posiciones de un torneo
 */
export function useTournamentStandings(tournamentId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.tournaments.standings(tournamentId || ""),
    queryFn: async () => {
      if (!tournamentId) return []

      // Obtener equipos del torneo con sus partidos
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, slug, logo")
        .eq("tournament_id", tournamentId)
        .eq("is_active", true)

      if (teamsError) throw teamsError
      if (!teams || teams.length === 0) return []

      const teamIds = teams.map((t) => t.id)

      // Obtener partidos terminados
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("home_team_id, away_team_id, home_score, away_score")
        .eq("tournament_id", tournamentId)
        .eq("status", "finished")
        .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)

      if (matchesError) throw matchesError

      // Calcular estadísticas por equipo
      const standings = teams.map((team) => {
        let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0, played = 0

        matches?.forEach((match) => {
          if (match.home_score === null || match.away_score === null) return

          const isHome = match.home_team_id === team.id
          const isAway = match.away_team_id === team.id

          if (!isHome && !isAway) return

          played++
          const teamScore = isHome ? match.home_score : match.away_score
          const opponentScore = isHome ? match.away_score : match.home_score

          goalsFor += teamScore
          goalsAgainst += opponentScore

          if (teamScore > opponentScore) wins++
          else if (teamScore < opponentScore) losses++
          else draws++
        })

        return {
          ...team,
          played,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          goalDifference: goalsFor - goalsAgainst,
          points: wins * 3 + draws,
        }
      })

      // Ordenar por puntos, diferencia de goles, goles a favor
      return standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
        return b.goalsFor - a.goalsFor
      })
    },
    enabled: !!tournamentId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}
