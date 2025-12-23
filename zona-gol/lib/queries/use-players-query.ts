"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { queryKeys } from "./query-keys"
import { Database } from "@/lib/supabase/database.types"

type Player = Database["public"]["Tables"]["players"]["Row"]
type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"]
type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"]
type PlayerStats = Database["public"]["Tables"]["player_stats"]["Row"]

// Tipo para jugador con estadísticas agregadas
interface PlayerWithStats extends Player {
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_minutes_played: number
  matches_played: number
}

/**
 * Hook para obtener jugadores de un equipo
 */
export function usePlayersByTeam(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.players.byTeam(teamId || ""),
    queryFn: async (): Promise<Player[]> => {
      if (!teamId) return []

      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId)
        .eq("is_active", true)
        .order("jersey_number", { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!teamId,
  })
}

/**
 * Hook para obtener estadísticas de todos los jugadores de un equipo
 * OPTIMIZADO: Primero carga jugadores, luego stats filtradas por player_ids
 */
export function usePlayerStatsByTeam(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.players.statsByTeam(teamId || ""),
    queryFn: async (): Promise<PlayerWithStats[]> => {
      if (!teamId) return []

      // Primero obtener los jugadores del equipo
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId)
        .eq("is_active", true)
        .order("jersey_number", { ascending: true })

      if (playersError) throw playersError
      if (!players || players.length === 0) return []

      // Obtener IDs de jugadores
      const playerIds = players.map(p => p.id)

      // Obtener stats de esos jugadores
      const { data: allStats, error: statsError } = await supabase
        .from("player_stats")
        .select("player_id, goals, assists, yellow_cards, red_cards, minutes_played")
        .in("player_id", playerIds)

      if (statsError) throw statsError

      // Agrupar estadísticas por player_id usando Map (O(n))
      const statsMap = new Map<string, typeof allStats>()
      ;(allStats || []).forEach((stat) => {
        if (!statsMap.has(stat.player_id)) {
          statsMap.set(stat.player_id, [])
        }
        statsMap.get(stat.player_id)!.push(stat)
      })

      // Combinar jugadores con sus estadísticas
      const playersWithStats: PlayerWithStats[] = players.map((player) => {
        const playerStats = statsMap.get(player.id) || []

        return {
          ...player,
          total_goals: playerStats.reduce((sum, s) => sum + (s.goals || 0), 0),
          total_assists: playerStats.reduce((sum, s) => sum + (s.assists || 0), 0),
          total_yellow_cards: playerStats.reduce((sum, s) => sum + (s.yellow_cards || 0), 0),
          total_red_cards: playerStats.reduce((sum, s) => sum + (s.red_cards || 0), 0),
          total_minutes_played: playerStats.reduce((sum, s) => sum + (s.minutes_played || 0), 0),
          matches_played: playerStats.length,
        }
      })

      return playersWithStats
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos en cache
  })
}

/**
 * Hook para obtener jugadores suspendidos de un equipo
 */
export function useSuspendedPlayers(teamId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.players.suspensions(teamId || ""),
    queryFn: async (): Promise<Set<string>> => {
      if (!teamId) return new Set()

      const { data, error } = await supabase
        .from("player_suspensions")
        .select("player_id")
        .eq("team_id", teamId)
        .eq("status", "active")

      if (error) throw error
      return new Set(data?.map((s) => s.player_id) || [])
    },
    enabled: !!teamId,
  })
}

/**
 * Hook para obtener un jugador por ID
 */
export function usePlayerById(playerId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.players.detail(playerId || ""),
    queryFn: async (): Promise<Player | null> => {
      if (!playerId) return null

      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!playerId,
  })
}

/**
 * Mutation para crear jugador
 */
export function useCreatePlayer() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async (playerData: PlayerInsert) => {
      const { data, error } = await supabase
        .from("players")
        .insert(playerData)
        .select()
        .single()

      if (error) throw error
      return data as Player
    },
    onSuccess: (data) => {
      // Invalidar y forzar refetch de queries de jugadores del equipo
      queryClient.invalidateQueries({
        queryKey: queryKeys.players.byTeam(data.team_id),
        refetchType: 'all'
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.players.statsByTeam(data.team_id),
        refetchType: 'all'
      })
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
      return { player: data as Player, teamId }
    },
    onSuccess: async ({ player, teamId }) => {
      // Actualizar caché individual
      queryClient.setQueryData(queryKeys.players.detail(player.id), player)
      // Forzar refetch inmediato de lista del equipo
      await queryClient.refetchQueries({
        queryKey: queryKeys.players.byTeam(teamId),
        type: 'active'
      })
      await queryClient.refetchQueries({
        queryKey: queryKeys.players.statsByTeam(teamId),
        type: 'active'
      })
    },
  })
}

/**
 * Mutation para eliminar jugador (soft delete)
 */
export function useDeletePlayer() {
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase
        .from("players")
        .update({ is_active: false })
        .eq("id", id)

      if (error) throw error
      return { id, teamId }
    },
  })
}
