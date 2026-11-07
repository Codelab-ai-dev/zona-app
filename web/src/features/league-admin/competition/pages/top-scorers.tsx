import { useAuth } from '@/lib/auth/auth-context'
import { TopScorersPage } from '../components'

export function TopScorersPageComponent() {
  const { profile } = useAuth()
  const leagueId = profile?.league_id

  if (!leagueId) {
    return <p className="text-center py-8">Sin liga asignada</p>
  }

  return <TopScorersPage leagueId={leagueId} />
}
