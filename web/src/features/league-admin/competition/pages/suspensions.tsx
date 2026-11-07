import { useAuth } from '@/lib/auth/auth-context'
import { SuspensionsPage } from '../components'

export function SuspensionsPageComponent() {
  const { profile } = useAuth()
  const leagueId = profile?.league_id

  if (!leagueId) {
    return <p className="text-center py-8">Sin liga asignada</p>
  }

  return <SuspensionsPage leagueId={leagueId} />
}
