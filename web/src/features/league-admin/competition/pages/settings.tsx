import { SettingsPage } from '../components'
import { LeagueScope } from '../league-scope'

export function SettingsPageComponent() {
  return <LeagueScope>{(leagueId) => <SettingsPage leagueId={leagueId} />}</LeagueScope>
}
