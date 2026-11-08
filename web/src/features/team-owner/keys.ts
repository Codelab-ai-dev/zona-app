import type { PageParams } from '@/lib/api/client'

/** Query keys follow TanStack Query convention: base, filters, mutations. */
export const teamOwnerKeys = {
  all: ['team-owner'] as const,
  myTeams: () => [...teamOwnerKeys.all, 'my-teams'] as const,
  teams: () => [...teamOwnerKeys.all, 'teams'] as const,
  team: (teamId: string) => [...teamOwnerKeys.teams(), teamId] as const,
  players: (teamId: string) => [...teamOwnerKeys.team(teamId), 'players'] as const,
  player: (playerId: string) => [...teamOwnerKeys.all, 'players', playerId] as const,
  coaching: (teamId: string) => [...teamOwnerKeys.team(teamId), 'coaching-staff'] as const,
  staff: (staffId: string) => [...teamOwnerKeys.all, 'coaching-staff', staffId] as const,
  matches: (teamId: string, page?: PageParams) => [...teamOwnerKeys.team(teamId), 'matches', page ?? {}] as const,
  standings: (tournamentId: string) => [...teamOwnerKeys.all, 'standings', tournamentId] as const,
  topScorers: (tournamentId: string) => [...teamOwnerKeys.all, 'top-scorers', tournamentId] as const,
  stats: (teamId: string) => [...teamOwnerKeys.team(teamId), 'stats'] as const,
  playerStats: (teamId: string, tournamentId?: string) => [...teamOwnerKeys.team(teamId), 'player-stats', tournamentId ?? ''] as const,
  league: (leagueId: string) => [...teamOwnerKeys.all, 'league', leagueId] as const,
  suspensions: (teamId: string) => [...teamOwnerKeys.team(teamId), 'suspensions'] as const,
  finance: (teamId: string, leagueId: string) => [...teamOwnerKeys.team(teamId), 'finance', leagueId] as const,
  transactions: (leagueId: string, teamId: string) => [...teamOwnerKeys.finance(teamId, leagueId), 'transactions'] as const,
  match: (matchId: string) => [...teamOwnerKeys.all, 'match', matchId] as const,
  refereeReport: (matchId: string) => [...teamOwnerKeys.all, 'referee-report', matchId] as const,
  tournament: (tournamentId: string) => [...teamOwnerKeys.all, 'tournament', tournamentId] as const,
  registrationRequests: (teamId: string) => [...teamOwnerKeys.team(teamId), 'registration-requests'] as const,
}
