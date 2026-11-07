import { useAuth } from '@/lib/auth/auth-context'
import { StandingsPage } from '../components'

export function StandingsPageComponent() {
  const { profile } = useAuth()
  const leagueId = profile?.league_id

  if (!leagueId) {
    return <p className="text-center py-8">Sin liga asignada</p>
  }

  return <StandingsPage leagueId={leagueId} />
}
