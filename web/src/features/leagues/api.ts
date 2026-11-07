import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api, type PageParams } from '@/lib/api/client'

import type { League, Tournament } from './types'

/** Query keys live next to their hooks so invalidation stays consistent. */
export const leagueKeys = {
  all: ['leagues'] as const,
  list: (page: PageParams) => [...leagueKeys.all, 'list', page] as const,
  bySlug: (slug: string) => [...leagueKeys.all, 'slug', slug] as const,
  tournaments: (leagueId: string) => [...leagueKeys.all, leagueId, 'tournaments'] as const,
}

export function useActiveLeagues(page: PageParams = { limit: 100 }) {
  return useQuery({
    queryKey: leagueKeys.list(page),
    queryFn: ({ signal }) => api.list<League>('/leagues', page, { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useLeagueBySlug(slug: string) {
  return useQuery({
    queryKey: leagueKeys.bySlug(slug),
    queryFn: ({ signal }) => api.get<League>(`/leagues/slug/${encodeURIComponent(slug)}`, { signal }),
    enabled: slug !== '',
  })
}

export function useLeagueTournaments(leagueId: string | undefined) {
  return useQuery({
    queryKey: leagueKeys.tournaments(leagueId ?? ''),
    queryFn: ({ signal }) => api.list<Tournament>(`/leagues/${leagueId}/tournaments`, { limit: 100 }, { signal }),
    enabled: Boolean(leagueId),
  })
}
