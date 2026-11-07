import { useState } from 'react'

import { useMyLeagues } from '@/features/leagues/api'

/** Leagues the admin manages plus the active one (defaults to the first). */
export function useSelectedLeague() {
  const leaguesQuery = useMyLeagues()
  const [chosen, setChosen] = useState('')
  const leagueId = chosen || leaguesQuery.data?.data[0]?.id || ''
  return { leaguesQuery, leagueId, setLeagueId: setChosen }
}
