import { useAuth } from '@/lib/auth/auth-context'
import { WhatsAppPage } from '../components'

export function WhatsAppPageComponent() {
  const { profile } = useAuth()
  const leagueId = profile?.league_id

  if (!leagueId) {
    return <p className="text-center py-8">Sin liga asignada</p>
  }

  return <WhatsAppPage leagueId={leagueId} />
}
