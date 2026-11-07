import { TournamentList } from '../components'
import { LeagueScope } from '../league-scope'

export function TournamentsPage() {
  return <LeagueScope>{(leagueId) => <TournamentList leagueId={leagueId} />}</LeagueScope>
}
