import { useState } from 'react'

import { EmptyState, QueryState } from '@/components/states'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useMyLeagues } from '@/features/leagues/api'
import { CalendarPage } from './calendar-page'
import { ResultsPage } from './results-page'

/**
 * Wrapper that loads user's leagues via useMyLeagues() and lets them select one
 * for the calendar. If no leagues, show EmptyState.
 */
export function MatchesLayoutPage() {
  return <LeagueScope>{(leagueId, leagueSlug) => <CalendarPage leagueId={leagueId} leagueSlug={leagueSlug} />}</LeagueScope>
}

/** "Resultados" tab: same league selection, result entry list. */
export function ResultsLayoutPage() {
  return <LeagueScope>{(leagueId) => <ResultsPage leagueId={leagueId} />}</LeagueScope>
}

function LeagueScope({ children }: { children: (leagueId: string, leagueSlug?: string) => React.ReactNode }) {
  const leagues = useMyLeagues()
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('')

  return (
    <QueryState
      query={leagues}
      isEmpty={(res) => res.data.length === 0}
      empty={
        <EmptyState
          title="No administras ninguna liga"
          description="Contacta a tu supervisor para que te agregue como administrador de liga."
        />
      }
    >
      {(res) => {
        // Auto-select first league if not selected
        const leagueToUse = selectedLeagueId || res.data[0]?.id
        const leagueSlug = res.data.find((l) => l.id === leagueToUse)?.slug

        return (
          <>
            {res.data.length > 1 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm">Selecciona una liga</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={leagueToUse} onValueChange={setSelectedLeagueId}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {res.data.map((league) => (
                        <SelectItem key={league.id} value={league.id}>
                          {league.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
            {leagueToUse && children(leagueToUse, leagueSlug)}
          </>
        )
      }}
    </QueryState>
  )
}
