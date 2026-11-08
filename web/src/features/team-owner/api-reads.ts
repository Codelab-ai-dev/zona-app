import { useQuery } from '@tanstack/react-query'

import { api, type ListResponse, type PageParams } from '@/lib/api/client'

import { teamOwnerKeys } from './keys'
import type {
  Match,
  Standings,
  TeamStats,
  PlayerStats,
  Suspension,
  Finance,
  FinanceTransaction,
  MyTeam,
  RefereeReport,
  Tournament,
  TeamPlayerStats,
  LeagueInfo,
} from './types'

/** GET /my-teams - teams owned by the signed-in user (an owner may have several). */
export function useMyTeams() {
  return useQuery({
    queryKey: teamOwnerKeys.myTeams(),
    queryFn: ({ signal }) => api.list<MyTeam>('/my-teams', { limit: 100 }, { signal }),
  })
}

/** GET /teams/{teamID}/matches - list team matches. */
export function useTeamMatches(teamId: string | undefined, page?: PageParams) {
  return useQuery({
    queryKey: teamOwnerKeys.matches(teamId ?? '', page),
    queryFn: ({ signal }) => api.list<Match>(`/teams/${teamId}/matches`, page, { signal }),
    enabled: Boolean(teamId),
  })
}

/** GET /tournaments/{tournamentID}/standings - get tournament standings. */
export function useTournamentStandings(tournamentId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.standings(tournamentId ?? ''),
    queryFn: ({ signal }) => api.list<Standings>(`/tournaments/${tournamentId}/standings`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/** GET /tournaments/{tournamentID}/top-scorers - get top scorers. */
export function useTopScorers(tournamentId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.topScorers(tournamentId ?? ''),
    queryFn: ({ signal }) => api.list<PlayerStats>(`/tournaments/${tournamentId}/top-scorers`, { limit: 100 }, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/** GET /teams/{teamID}/stats - get team stats for a tournament. */
export function useTeamStats(teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.stats(teamId ?? ''),
    // The API answers with the single stats row of the team's tournament, not a list.
    queryFn: async ({ signal }): Promise<ListResponse<TeamStats>> => {
      const res = await api.get<ListResponse<TeamStats> | TeamStats>(`/teams/${teamId}/stats`, { signal, query: { limit: 10 } })
      if ('data' in res && Array.isArray(res.data)) return res
      return { data: [res as TeamStats], page: { limit: 1, offset: 0 } }
    },
    enabled: Boolean(teamId),
  })
}

/** GET /players/{playerID}/stats - get player stats. */
export function usePlayerStats(playerId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.player(playerId ?? ''),
    queryFn: ({ signal }) => api.get<PlayerStats>(`/players/${playerId}/stats`, { signal }),
    enabled: Boolean(playerId),
  })
}

/** GET /teams/{teamID}/suspensions - list team suspensions. */
export function useTeamSuspensions(teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.suspensions(teamId ?? ''),
    queryFn: ({ signal }) => api.list<Suspension>(`/teams/${teamId}/suspensions`, { limit: 100 }, { signal }),
    enabled: Boolean(teamId),
  })
}

/** GET /leagues/{leagueID}/finance/teams/{teamID}/balance - get team financial balance. */
export function useTeamFinanceBalance(leagueId: string | undefined, teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.finance(teamId ?? '', leagueId ?? ''),
    queryFn: ({ signal }) => api.get<Finance>(`/leagues/${leagueId}/finance/teams/${teamId}/balance`, { signal }),
    enabled: Boolean(leagueId && teamId),
  })
}

/** GET /leagues/{leagueID}/finance/teams/{teamID}/transactions - list team transactions. */
export function useTeamTransactions(leagueId: string | undefined, teamId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.transactions(leagueId ?? '', teamId ?? ''),
    queryFn: ({ signal }) =>
      api.list<FinanceTransaction>(`/leagues/${leagueId}/finance/teams/${teamId}/transactions`, { limit: 100 }, { signal }),
    enabled: Boolean(leagueId && teamId),
  })
}

/** GET /matches/{matchID} - fetch single match. */
export function useMatch(matchId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.match(matchId ?? ''),
    queryFn: ({ signal }) => api.get<Match>(`/matches/${matchId}`, { signal }),
    enabled: Boolean(matchId),
  })
}

/** GET /matches/{matchID}/referee-report - fetch referee report (404 when none was filed). */
export function useRefereeReport(matchId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.refereeReport(matchId ?? ''),
    queryFn: ({ signal }) => api.get<RefereeReport>(`/matches/${matchId}/referee-report`, { signal }),
    enabled: Boolean(matchId),
  })
}

/** GET /tournaments/{tournamentID} - fetch tournament. */
export function useTournament(tournamentId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.tournament(tournamentId ?? ''),
    queryFn: ({ signal }) => api.get<Tournament>(`/tournaments/${tournamentId}`, { signal }),
    enabled: Boolean(tournamentId),
  })
}

/** GET /teams/{teamID}/player-stats - per-player totals of a team (public). */
export function useTeamPlayerStats(teamId: string | undefined, tournamentId?: string) {
  return useQuery({
    queryKey: teamOwnerKeys.playerStats(teamId ?? '', tournamentId),
    queryFn: ({ signal }) =>
      api.get<{ data: TeamPlayerStats[] }>(`/teams/${teamId}/player-stats`, {
        signal,
        query: tournamentId ? { tournament_id: tournamentId } : undefined,
      }),
    enabled: Boolean(teamId),
  })
}

/** GET /leagues/{leagueID} (public): whether the league enabled QR credentials. */
export function useLeagueQrEnabled(leagueId: string | undefined) {
  return useQuery({
    queryKey: teamOwnerKeys.league(leagueId ?? ''),
    queryFn: ({ signal }) => api.get<LeagueInfo>(`/leagues/${leagueId}`, { signal }),
    select: (league) => league.features?.qr_codes === true,
    enabled: Boolean(leagueId),
  })
}
