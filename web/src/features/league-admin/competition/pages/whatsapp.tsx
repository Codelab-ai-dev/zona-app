import { WhatsAppPage } from '../components'
import { LeagueScope } from '../league-scope'

export function WhatsAppPageComponent() {
  return <LeagueScope>{(leagueId) => <WhatsAppPage leagueId={leagueId} />}</LeagueScope>
}
