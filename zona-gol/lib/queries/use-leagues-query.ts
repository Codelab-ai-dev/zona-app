"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { queryKeys } from "./query-keys"
import { Database } from "@/lib/supabase/database.types"

type League = Database["public"]["Tables"]["leagues"]["Row"]

/**
 * Hook para obtener todas las ligas activas
 */
export function useLeagues() {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.leagues.list(),
    queryFn: async (): Promise<League[]> => {
      const { data, error } = await supabase
        .from("leagues")
        .select("id, name, slug, logo, description, is_active, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutos - las ligas no cambian frecuentemente
  })
}

/**
 * Hook para obtener una liga por ID
 */
export function useLeagueById(leagueId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.leagues.detail(leagueId || ""),
    queryFn: async (): Promise<League | null> => {
      if (!leagueId) return null

      const { data, error } = await supabase
        .from("leagues")
        .select("*")
        .eq("id", leagueId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!leagueId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos en cache
  })
}

/**
 * Hook para obtener estadísticas de una liga
 * Optimizado con Promise.all para paralelizar queries
 */
export function useLeagueStats(leagueId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.leagues.stats(leagueId || ""),
    queryFn: async () => {
      if (!leagueId) return null

      // Paralelizar todas las queries
      const [teamsResult, tournamentsResult, playersResult, matchesResult] = await Promise.all([
        supabase
          .from("teams")
          .select("id", { count: "exact", head: true })
          .eq("league_id", leagueId)
          .eq("is_active", true),
        supabase
          .from("tournaments")
          .select("id", { count: "exact", head: true })
          .eq("league_id", leagueId),
        supabase
          .from("players")
          .select("id, team:teams!inner(league_id)", { count: "exact", head: true })
          .eq("team.league_id", leagueId)
          .eq("is_active", true),
        supabase
          .from("matches")
          .select("id, tournament:tournaments!inner(league_id)", { count: "exact", head: true })
          .eq("tournament.league_id", leagueId),
      ])

      return {
        teamsCount: teamsResult.count || 0,
        tournamentsCount: tournamentsResult.count || 0,
        playersCount: playersResult.count || 0,
        matchesCount: matchesResult.count || 0,
      }
    },
    enabled: !!leagueId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

/**
 * Hook para obtener features de una liga
 */
export function useLeagueFeatures(leagueId: string | undefined) {
  const supabase = createClientSupabaseClient()

  return useQuery({
    queryKey: queryKeys.leagues.features(leagueId || ""),
    queryFn: async () => {
      if (!leagueId) return null

      const { data, error } = await supabase
        .from("league_features")
        .select("feature_name, is_enabled")
        .eq("league_id", leagueId)

      if (error) throw error

      // Convertir a objeto para fácil acceso
      const features: Record<string, boolean> = {}
      data?.forEach((f) => {
        features[f.feature_name] = f.is_enabled
      })

      return features
    },
    enabled: !!leagueId,
    staleTime: 30 * 60 * 1000, // 30 minutos - features no cambian frecuentemente
  })
}
