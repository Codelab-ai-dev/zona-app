import type { PageParams } from '@/lib/api/client'

export const competitionKeys = {
  all: ['competition'] as const,
  tournaments: (leagueId: string) => [...competitionKeys.all, 'tournaments', leagueId] as const,
  tournament: (tournamentId: string) => [...competitionKeys.all, 'tournament', tournamentId] as const,
  standings: (tournamentId: string) => [...competitionKeys.all, 'standings', tournamentId] as const,
  topScorers: (tournamentId: string) => [...competitionKeys.all, 'topScorers', tournamentId] as const,
  discipline: (tournamentId: string) => [...competitionKeys.all, 'discipline', tournamentId] as const,
  suspensions: (leagueId: string) => [...competitionKeys.all, 'suspensions', leagueId] as const,
  whatsappLinks: (leagueId: string) => [...competitionKeys.all, 'whatsappLinks', leagueId] as const,
  financeConfig: (leagueId: string) => [...competitionKeys.all, 'financeConfig', leagueId] as const,
  transactions: (leagueId: string, page: PageParams) =>
    [...competitionKeys.all, 'transactions', leagueId, page] as const,
  teamBalance: (leagueId: string, page: PageParams) =>
    [...competitionKeys.all, 'teamBalance', leagueId, page] as const,
  leagueSummary: (leagueId: string) => [...competitionKeys.all, 'leagueSummary', leagueId] as const,
  league: (leagueId: string) => [...competitionKeys.all, 'league', leagueId] as const,
}
