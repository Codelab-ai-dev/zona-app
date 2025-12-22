/**
 * TanStack Query Hooks - Exportaciones centralizadas
 *
 * Uso:
 * import { useTeamsByLeague, usePlayerStatsByTeam } from "@/lib/queries"
 */

// Query Keys
export { queryKeys } from "./query-keys"

// Teams
export {
  useTeamsByLeague,
  useTeamsByOwner,
  useTeamById,
  useTeamStats,
  useTeamStatsByTournament,
  useInvalidateTeamStats,
  useTeamOwnerStats,
  useTeamOwnerSummary,
  useTeamSuspensions,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  // Coaching Staff
  useCoachingStaff,
  useCreateCoachingStaff,
  useUpdateCoachingStaff,
  useDeleteCoachingStaff,
  // Team Scorers
  useTeamScorers,
  // Players (con límites de torneo)
  usePlayers,
  // Team Uniforms
  useTeamUniforms,
  useUpdateTeamUniforms,
  // Team Info with Player Stats
  useTeamInfo,
} from "./use-teams-query"

// Players
export {
  usePlayersByTeam,
  usePlayerStatsByTeam,
  useSuspendedPlayers,
  usePlayerById,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
} from "./use-players-query"

// Leagues
export {
  useLeagues,
  useLeagueById,
  useLeagueStats,
  useLeagueFeatures,
} from "./use-leagues-query"

// Tournaments
export {
  useTournamentsByLeague,
  useActiveTournament,
  useTournamentById,
  useTournamentStandings,
} from "./use-tournaments-query"

// Matches
export {
  useMatchesByTournament,
  useMatchesByTeam,
  usePendingMatchesByLeague,
  useUpcomingMatches,
  useMatchById,
  useUpdateMatchResult,
  useInvalidateMatches,
} from "./use-matches-query"
