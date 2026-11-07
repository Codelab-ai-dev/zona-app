import { HomePage as HomeContent } from '../components'
import { LeagueScope } from '../league-scope'

export function HomePage() {
  return <LeagueScope>{(leagueId) => <HomeContent leagueId={leagueId} />}</LeagueScope>
}
