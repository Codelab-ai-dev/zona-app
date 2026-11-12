import { SuspensionsPage } from '../components'
import { LeagueScope } from '../league-scope'

export function SuspensionsPageComponent() {
  return <LeagueScope>{(leagueId) => <SuspensionsPage leagueId={leagueId} />}</LeagueScope>
}
