import { useAuth } from '@/lib/auth/auth-context'
import { HomePage as HomePageComponent } from '../components'

export function HomePage() {
  const { profile } = useAuth()
  const leagueId = profile?.league_id

  if (!leagueId) {
    return <p className="text-center py-8">Sin liga asignada</p>
  }

  return <HomePageComponent leagueId={leagueId} />
}
