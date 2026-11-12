import { rulesFromTournament } from './age-rules'
import { useTeam, useTournament } from './api'

/** Registration rules of the tournament the team plays in (no tournament = no restrictions). */
export function useTeamRules(teamId: string) {
  const team = useTeam(teamId)
  const tournament = useTournament(team.data?.tournament_id)
  const t = tournament.data
  return {
    team: team.data,
    registrationOpen: t?.registration_open ?? true,
    maxPlayers: t?.max_players && t.max_players > 0 ? t.max_players : null,
    maxStaff: t?.max_coaching_staff && t.max_coaching_staff > 0 ? t.max_coaching_staff : null,
    ageRules: rulesFromTournament(t),
  }
}
