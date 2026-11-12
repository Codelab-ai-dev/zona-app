import { StandingsPage } from '../components'
import { LeagueScope } from '../league-scope'

export function StandingsPageComponent() {
  return <LeagueScope>{(leagueId) => <StandingsPage leagueId={leagueId} />}</LeagueScope>
}
