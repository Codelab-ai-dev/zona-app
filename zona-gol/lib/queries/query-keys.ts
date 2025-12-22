/**
 * Query Keys centralizadas para TanStack Query
 * Esto permite invalidación precisa del caché
 */

export const queryKeys = {
  // Leagues
  leagues: {
    all: ['leagues'] as const,
    list: () => [...queryKeys.leagues.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.leagues.all, 'detail', id] as const,
    stats: (id: string) => [...queryKeys.leagues.all, 'stats', id] as const,
    features: (id: string) => [...queryKeys.leagues.all, 'features', id] as const,
  },

  // Tournaments
  tournaments: {
    all: ['tournaments'] as const,
    list: () => [...queryKeys.tournaments.all, 'list'] as const,
    byLeague: (leagueId: string) => [...queryKeys.tournaments.all, 'byLeague', leagueId] as const,
    detail: (id: string) => [...queryKeys.tournaments.all, 'detail', id] as const,
    standings: (id: string) => [...queryKeys.tournaments.all, 'standings', id] as const,
  },

  // Teams
  teams: {
    all: ['teams'] as const,
    list: () => [...queryKeys.teams.all, 'list'] as const,
    byLeague: (leagueId: string) => [...queryKeys.teams.all, 'byLeague', leagueId] as const,
    byTournament: (tournamentId: string) => [...queryKeys.teams.all, 'byTournament', tournamentId] as const,
    byOwner: () => [...queryKeys.teams.all, 'byOwner'] as const,
    detail: (id: string) => [...queryKeys.teams.all, 'detail', id] as const,
    stats: (id: string) => [...queryKeys.teams.all, 'stats', id] as const,
  },

  // Players
  players: {
    all: ['players'] as const,
    byTeam: (teamId: string) => [...queryKeys.players.all, 'byTeam', teamId] as const,
    detail: (id: string) => [...queryKeys.players.all, 'detail', id] as const,
    stats: (playerId: string) => [...queryKeys.players.all, 'stats', playerId] as const,
    statsByTeam: (teamId: string) => [...queryKeys.players.all, 'statsByTeam', teamId] as const,
    suspensions: (teamId: string) => [...queryKeys.players.all, 'suspensions', teamId] as const,
  },

  // Matches
  matches: {
    all: ['matches'] as const,
    byTournament: (tournamentId: string) => [...queryKeys.matches.all, 'byTournament', tournamentId] as const,
    byTeam: (teamId: string) => [...queryKeys.matches.all, 'byTeam', teamId] as const,
    byLeague: (leagueId: string) => [...queryKeys.matches.all, 'byLeague', leagueId] as const,
    pendingByLeague: (leagueId: string) => [...queryKeys.matches.all, 'pendingByLeague', leagueId] as const,
    upcoming: (tournamentId: string) => [...queryKeys.matches.all, 'upcoming', tournamentId] as const,
    detail: (id: string) => [...queryKeys.matches.all, 'detail', id] as const,
  },

  // Team Stats (Standings)
  teamStats: {
    all: ['teamStats'] as const,
    byTournament: (tournamentId: string) => [...queryKeys.teamStats.all, 'byTournament', tournamentId] as const,
  },

  // Auth/User
  auth: {
    user: ['auth', 'user'] as const,
    profile: ['auth', 'profile'] as const,
    session: ['auth', 'session'] as const,
  },

  // Coaching Staff
  coachingStaff: {
    all: ['coachingStaff'] as const,
    byTeam: (teamId: string) => [...queryKeys.coachingStaff.all, 'byTeam', teamId] as const,
    detail: (id: string) => [...queryKeys.coachingStaff.all, 'detail', id] as const,
  },

  // Team Uniforms
  uniforms: {
    all: ['uniforms'] as const,
    byTeam: (teamId: string) => [...queryKeys.uniforms.all, 'byTeam', teamId] as const,
  },
}
