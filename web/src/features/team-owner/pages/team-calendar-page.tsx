import { Calendar, CalendarDays, CheckCircle2, Clock } from 'lucide-react'
import { useState } from 'react'

import { QueryState } from '@/components/states'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { useTeamMatches } from '../api'
import { MatchCard, matchResult } from '../components/match-card'
import { RefereeReportModal } from '../components/referee-report-modal'
import { glassCard, pageSubtitle, pageTitle } from '../glass'
import { useTeamNames } from '../team-names'
import type { Match } from '../types'

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

function groupByRound(list: Match[]): [number | null, Match[]][] {
  const grouped = new Map<number | null, Match[]>()
  list.forEach((m) => {
    const round = m.round ?? null
    grouped.set(round, [...(grouped.get(round) ?? []), m])
  })
  return [...grouped.entries()].sort((a, b) => (a[0] === null ? 1 : b[0] === null ? -1 : a[0] - b[0]))
}

function SummaryCard({ icon, value, label, valueClass = 'text-white' }: { icon: React.ReactNode; value: number; label: string; valueClass?: string }) {
  return (
    <Card className={glassCard}>
      <CardContent className="pt-4 sm:pt-6 text-center">
        {icon}
        <p className={cn('text-xl sm:text-2xl font-bold drop-shadow-lg', valueClass)}>{value}</p>
        <p className="text-xs sm:text-sm text-white/80 drop-shadow">{label}</p>
      </CardContent>
    </Card>
  )
}

/** Calendario tab: fixtures grouped by jornada; the owner only sees published matches. */
export function TeamCalendarPage({ teamId }: { teamId: string }) {
  const matches = useTeamMatches(teamId)
  const teamName = useTeamNames(teamId)
  const [reportMatchId, setReportMatchId] = useState<string | null>(null)

  return (
    <QueryState query={matches} isEmpty={(res) => res.data.length === 0} empty={<EmptyCalendar />}>
      {(res) => {
        const published = res.data.filter((m) => m.is_published)
        const finished = published.filter((m) => m.status === 'finished').sort((a, b) => b.match_date.localeCompare(a.match_date))
        const scheduled = published.filter((m) => m.status === 'scheduled').sort((a, b) => a.match_date.localeCompare(b.match_date))
        const wins = finished.filter((m) => matchResult(m, teamId) === 'win').length
        const name = (m: Match, side: 'home' | 'away') =>
          (side === 'home' ? m.home_team?.name : m.away_team?.name) ?? teamName(side === 'home' ? m.home_team_id : m.away_team_id) ?? 'Equipo'
        const renderRound = (round: number | null, list: Match[], withDots: boolean, noun: [string, string]) => (
          <Card key={`${withDots ? 'f' : 's'}-${round}`} className={glassCard}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg text-white drop-shadow-lg flex items-center justify-between">
                <span>{round ? `Jornada ${round}` : 'Sin jornada asignada'}</span>
                {withDots && (
                  <div className="flex gap-1" aria-hidden="true">
                    {list.map((m) => {
                      const r = matchResult(m, teamId)
                      return <div key={m.id} className={cn('w-2 h-2 rounded-full', r === 'win' && 'bg-green-400', r === 'loss' && 'bg-red-400', r === 'draw' && 'bg-yellow-400')} />
                    })}
                  </div>
                )}
              </CardTitle>
              <CardDescription className="text-white/70 drop-shadow text-xs sm:text-sm">
                {list.length} {plural(list.length, noun[0], noun[1])}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {list.map((m) => (
                <MatchCard key={m.id} match={m} teamId={teamId} homeName={name(m, 'home')} awayName={name(m, 'away')} onViewReport={setReportMatchId} />
              ))}
            </CardContent>
          </Card>
        )
        return (
          <div className="space-y-6">
            <div>
              <h2 className={pageTitle}>Calendario</h2>
              <p className={pageSubtitle}>{published.length} {plural(published.length, 'partido', 'partidos')} en total</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <SummaryCard icon={<CalendarDays className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mx-auto mb-2" aria-hidden="true" />} value={published.length} label="Total" />
              <SummaryCard icon={<CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mx-auto mb-2" aria-hidden="true" />} value={finished.length} label="Jugados" />
              <SummaryCard icon={<Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 mx-auto mb-2" aria-hidden="true" />} value={scheduled.length} label="Programados" />
              <SummaryCard icon={<div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 flex items-center justify-center"><span className="text-lg sm:text-xl" aria-hidden="true">🏆</span></div>} value={wins} label="Victorias" valueClass="text-green-400" />
            </div>

            {finished.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white drop-shadow-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" aria-hidden="true" />
                  Partidos Finalizados
                </h3>
                {groupByRound(finished).map(([round, list]) => renderRound(round, list, true, ['partido jugado', 'partidos jugados']))}
              </div>
            )}

            {scheduled.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white drop-shadow-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-400" aria-hidden="true" />
                  Próximos Partidos
                </h3>
                {groupByRound(scheduled).map(([round, list]) => renderRound(round, list, false, ['partido', 'partidos']))}
              </div>
            )}

            {reportMatchId && <RefereeReportModal open onOpenChange={(open) => !open && setReportMatchId(null)} matchId={reportMatchId} />}
          </div>
        )
      }}
    </QueryState>
  )
}

function EmptyCalendar() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className={pageTitle}>Calendario</h2>
        <p className={pageSubtitle}>0 partidos en total</p>
      </div>
      <Card className={glassCard}>
        <CardContent className="text-center py-12">
          <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-white/60 mb-4" aria-hidden="true" />
          <p className="text-white/80 drop-shadow">No hay partidos programados todavía</p>
          <p className="text-sm text-white/70 drop-shadow mt-2">Los partidos aparecerán aquí cuando se programen</p>
        </CardContent>
      </Card>
    </div>
  )
}
