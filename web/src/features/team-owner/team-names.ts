import { useTeam, useTournamentStandings } from './api'

/**
 * Matches come without nested team names from the API, so opponents are named
 * through the tournament standings (team_id -> team_name).
 */
export function useTeamNames(teamId: string): (id: string) => string | undefined {
  const team = useTeam(teamId)
  const standings = useTournamentStandings(team.data?.tournament_id)
  const names = new Map((standings.data?.data ?? []).map((s) => [s.team_id, s.team_name]))
  if (team.data) names.set(team.data.id, team.data.name)
  return (id) => names.get(id)
}
