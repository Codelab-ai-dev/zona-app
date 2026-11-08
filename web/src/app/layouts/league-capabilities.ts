import { useQueries } from '@tanstack/react-query'

import { leagueKeys, useMyLeagues } from '@/features/leagues/api'
import type { League, Tournament } from '@/features/leagues/types'
import { api } from '@/lib/api/client'

/** League feature flags the original app gated tabs and actions with. */
export type LeagueFeature = 'qr_codes' | 'finance' | 'mobile_app' | 'facial_recognition'

export interface LeagueCapabilities {
  leagues: League[]
  /** True when any managed league enables the feature (original: features[f] === true). */
  has: (feature: LeagueFeature) => boolean
  /** Formats of the managed leagues' tournaments. */
  formats: Set<string>
  loading: boolean
}

/** What the league admin's leagues can do, for gating navigation. */
export function useLeagueCapabilities(enabled: boolean): LeagueCapabilities {
  const mine = useMyLeagues()
  const leagues = enabled ? (mine.data?.data ?? []) : []
  const tournaments = useQueries({
    queries: leagues.map((league) => ({
      queryKey: leagueKeys.tournaments(league.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api.list<Tournament>(`/leagues/${league.id}/tournaments`, { limit: 100 }, { signal }),
    })),
  })
  const formats = new Set<string>()
  for (const q of tournaments) {
    for (const t of q.data?.data ?? []) {
      if (t.tournament_format) formats.add(t.tournament_format)
    }
  }
  return {
    leagues,
    has: (feature) => leagues.some((l) => l.features?.[feature] === true),
    formats,
    loading: mine.isPending || tournaments.some((q) => q.isPending),
  }
}
