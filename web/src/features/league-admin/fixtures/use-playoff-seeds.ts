import { useState } from 'react'
import { toast } from 'sonner'

import type { Tournament } from '@/features/leagues/types'

import { useTeamsByLeague, useTournamentStandings } from './api'
import { qualifiedFromGroups } from './playoff-seeding'

/** Manual seeding state of the playoff dialog, plus loading the teams qualified from the groups. */
export function usePlayoffSeeds(leagueId: string, tournament: Tournament | undefined, numTeams: 4 | 8) {
  const [seeds, setSeeds] = useState<string[]>([])
  const leagueTeams = useTeamsByLeague(leagueId)
  const standings = useTournamentStandings(tournament?.id ?? '', false)

  const teams = (leagueTeams.data?.data ?? []).filter(
    (t) => t.is_active && (!t.tournament_id || t.tournament_id === tournament?.id),
  )
  const seedList = Array.from({ length: numTeams }, (_, i) => seeds[i] ?? '')
  const chosen = seedList.filter(Boolean).length

  const loadQualified = async (onLoaded: () => void) => {
    const res = await standings.refetch()
    if (res.error || !res.data) {
      toast.error('No se pudo cargar la tabla de posiciones')
      return
    }
    const perGroup = tournament?.teams_advancing_per_group ?? 2
    const result = qualifiedFromGroups(
      teams.filter((t) => t.tournament_id === tournament?.id),
      res.data.data,
      perGroup,
      numTeams,
    )
    setSeeds(result.seeds)
    onLoaded()
    if (result.qualified === 0) toast.error('Ningún equipo del torneo tiene grupo asignado')
    else if (result.qualified < numTeams) {
      toast.warning(`Solo clasifican ${result.qualified} equipos y la llave necesita ${numTeams}. Completa los lugares restantes a mano.`)
    } else toast.success(`${numTeams} equipos clasificados de la fase de grupos cargados`)
  }

  return {
    teams,
    seedList,
    chosen,
    complete: chosen === numTeams,
    hasDuplicates: new Set(seedList).size < numTeams,
    teamName: (id: string) => teams.find((t) => t.id === id)?.name ?? id,
    setSeed: (index: number, teamId: string) => setSeeds(seedList.map((s, j) => (j === index ? teamId : s))),
    clear: () => setSeeds([]),
    loadQualified,
    loadingQualified: standings.isFetching,
  }
}
