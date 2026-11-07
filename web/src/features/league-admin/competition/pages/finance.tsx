import { useAuth } from '@/lib/auth/auth-context'
import { FinancePage } from '../components'

export function FinancePageComponent() {
  const { profile } = useAuth()
  const leagueId = profile?.league_id

  if (!leagueId) {
    return <p className="text-center py-8">Sin liga asignada</p>
  }

  return <FinancePage leagueId={leagueId} />
}
