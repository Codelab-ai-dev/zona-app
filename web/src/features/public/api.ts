import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api/client'
import { leagueKeys } from '@/features/leagues/api'
import type { Tournament } from '@/features/leagues/types'

import type { Discipline, Match, Standing, Team, TopScorer, Player, CoachingStaff, TeamStats } from './types'

/** Query keys for public portal data. */
export const publicKeys = {
  tournaments: (leagueId: string) => [...leagueKeys.all, leagueId, 'tournaments-public'] as const,
  tournament: (tournamentId: string) => ['tournament', tournamentId] as const,
  standings: (tournamentId: string) => ['standings', tournamentId] as const,
  matches: (tournamentId: string) => ['matches', tournamentId] as const,
  matchesByTeam: (teamId: string) => ['matches-team', teamId] as const,
  topScorers: (tournamentId: string) => ['top-scorers', tournamentId] as const,
  discipline: (tournamentId: string) => ['discipline', tournamentId] as const,
  teams: (leagueId: string | undefined) => ['teams', leagueId] as const,
  team: (teamId: string) => ['team', teamId] as const,
  teamPlayers: (teamId: string) => ['team-players', teamId] as const,
  teamStats: (teamId: string) => ['team-stats', teamId] as const,
  teamMatches: (teamId: string) => ['team-matches', teamId] as const,
  coachingStaff: (teamId: string) => ['coaching-staff', teamId] as const,
}

/** Get tournaments for a public league. */
export function useTournamentsByLeague(leagueId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.tournaments(leagueId ?? ''),
    queryFn: ({ signal }) =>
      api.list<Tournament>(`/leagues/${leagueId}/tournaments`, { limit: 100 }, { signal }),
    enabled: Boolean(leagueId),
  })
}

/** Get one tournament (public). */
export function useTournament(tournamentId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.tournament(tournamentId ?? ''),
    queryFn: ({ signal }) => api.get<Tournament>(`/tournaments/${tournamentId}`, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/** Get tournament standings. */
export function useStandings(tournamentId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.standings(tournamentId ?? ''),
    queryFn: ({ signal }) => api.list<Standing>(`/tournaments/${tournamentId}/standings`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/** Max page size accepted by the API (backend httpx.MaxPageLimit). */
const PAGE_LIMIT = 100

/**
 * Get every visible match of a tournament. The API caps pages at 100 and a
 * double round robin easily exceeds that, so keep reading until a short page.
 */
export function useTournamentMatches(tournamentId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.matches(tournamentId ?? ''),
    queryFn: async ({ signal }) => {
      const all: Match[] = []
      for (let offset = 0; ; offset += PAGE_LIMIT) {
        const res = await api.list<Match>(`/tournaments/${tournamentId}/matches`, { limit: PAGE_LIMIT, offset }, { signal })
        all.push(...res.data)
        if (res.data.length < PAGE_LIMIT) return { data: all, page: { limit: all.length, offset: 0 } }
      }
    },
    enabled: Boolean(tournamentId),
  })
}

/** Get top scorers for a tournament. */
export function useTopScorers(tournamentId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.topScorers(tournamentId ?? ''),
    queryFn: ({ signal }) => api.list<TopScorer>(`/tournaments/${tournamentId}/top-scorers`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/** Get discipline (cards) for a tournament. */
export function useDiscipline(tournamentId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.discipline(tournamentId ?? ''),
    queryFn: ({ signal }) => api.list<Discipline>(`/tournaments/${tournamentId}/discipline`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/** Get teams for a league. */
export function useTeamsByLeague(leagueId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.teams(leagueId),
    staleTime: 60_000,
    queryFn: ({ signal }) => api.list<Team>('/teams', { limit: 100 }, { signal, query: { league_id: leagueId } }),
    enabled: Boolean(leagueId),
  })
}

/** Get team detail. */
export function useTeam(teamId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.team(teamId ?? ''),
    queryFn: ({ signal }) => api.get<Team>(`/teams/${teamId}`, { signal }),
    enabled: Boolean(teamId),
  })
}

/** Get team players. */
export function useTeamPlayers(teamId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.teamPlayers(teamId ?? ''),
    queryFn: ({ signal }) => api.list<Player>(`/teams/${teamId}/players`, { limit: 100 }, { signal }),
    enabled: Boolean(teamId),
  })
}

/** Get team stats. */
export function useTeamStats(teamId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.teamStats(teamId ?? ''),
    queryFn: ({ signal }) => api.get<TeamStats>(`/teams/${teamId}/stats`, { signal }),
    enabled: Boolean(teamId),
  })
}

/** Get team matches. */
export function useTeamMatches(teamId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.teamMatches(teamId ?? ''),
    queryFn: ({ signal }) => api.list<Match>(`/teams/${teamId}/matches`, { limit: 100 }, { signal }),
    enabled: Boolean(teamId),
  })
}

/** Get team coaching staff. */
export function useTeamCoachingStaff(teamId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.coachingStaff(teamId ?? ''),
    queryFn: ({ signal }) => api.list<CoachingStaff>(`/teams/${teamId}/coaching-staff`, { limit: 50 }, { signal }),
    enabled: Boolean(teamId),
  })
}
