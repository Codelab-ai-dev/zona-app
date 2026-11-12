import { FinancePage } from '../components'
import { LeagueScope } from '../league-scope'

export function FinancePageComponent() {
  return <LeagueScope>{(leagueId) => <FinancePage leagueId={leagueId} />}</LeagueScope>
}
