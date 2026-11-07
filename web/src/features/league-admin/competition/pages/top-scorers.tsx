import { TopScorersPage } from '../components'
import { LeagueScope } from '../league-scope'

export function TopScorersPageComponent() {
  return <LeagueScope>{(leagueId) => <TopScorersPage leagueId={leagueId} />}</LeagueScope>
}
