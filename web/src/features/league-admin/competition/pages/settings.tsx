import { useAuth } from '@/lib/auth/auth-context'
import { SettingsPage } from '../components'

export function SettingsPageComponent() {
  const { profile } = useAuth()
  const leagueId = profile?.league_id

  if (!leagueId) {
    return <p className="text-center py-8">Sin liga asignada</p>
  }

  return <SettingsPage leagueId={leagueId} />
}
