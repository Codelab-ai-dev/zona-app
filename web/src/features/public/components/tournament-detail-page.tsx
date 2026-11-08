import { Calendar, Shield, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { EmptyState, QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLeagueBySlug } from '@/features/leagues/api'
import { initials } from '@/features/leagues/leagues-page'

import { useDiscipline, useStandings, useTopScorers, useTournament, useTournamentMatches } from '../api'
import { formatDate, tournamentStatus } from '../format'
import { MatchList, type TeamLookup } from './match-list'
import { HeroCard, PublicPage, panelClass, tabTriggerClass } from './public-shell'
import { DisciplineTable, StandingsTable, TopScorersTable } from './stats-tables'

function Tile({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className={`${panelClass} p-2 text-center md:p-4`}>
      <div className="mx-auto mb-1 flex justify-center md:mb-2">{icon}</div>
      <p className="text-lg font-bold text-white md:text-2xl">{value}</p>
      <span className="text-[10px] text-gray-500 md:text-xs">{label}</span>
    </div>
  )
}

export function TournamentDetailPage() {
  const { slug, tournamentId } = useParams<{ slug: string; tournamentId: string }>()
  const [activeTab, setActiveTab] = useState('standings')

  const league = useLeagueBySlug(slug ?? '')
  const tournament = useTournament(tournamentId)
  const standings = useStandings(tournamentId)
  const matches = useTournamentMatches(tournamentId)
  const topScorers = useTopScorers(tournamentId)
  const discipline = useDiscipline(tournamentId)

  // Match payloads only carry team ids; standings list every team of the tournament.
  const teams = useMemo<TeamLookup>(
    () => new Map((standings.data?.data ?? []).map((s) => [s.team_id, { name: s.team_name, logo: s.team_logo }])),
    [standings.data],
  )
  const t = tournament.data
  const lg = league.data
  const iconCls = 'size-4 md:size-5'

  return (
    <PublicPage back={{ to: `/liga/${slug}`, label: 'Torneos' }}>
      <HeroCard>
        <div className="flex flex-col items-center gap-4 md:flex-row">
          <Avatar className="size-16 border-2 border-green-500/30 shadow-lg shadow-green-500/20 md:size-20">
            {lg?.logo && <AvatarImage src={lg.logo} alt="" className="object-cover" />}
            <AvatarFallback aria-hidden="true" className="bg-gradient-to-br from-green-500 to-emerald-600 text-xl font-bold text-white">
              {initials(lg?.name ?? 'Liga')}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-center md:text-left">
            <h1 className="mb-1 text-xl font-bold text-white md:text-2xl">{t?.name ?? 'Torneo'}</h1>
            {t && (
              <p className="mb-2 text-sm text-gray-400">
                {formatDate(t.start_date)} - {formatDate(t.end_date)}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <Badge asChild className="border-green-500/30 bg-green-500/20 text-xs text-green-400">
                <Link to={`/liga/${slug}`}>{lg?.name ?? 'Volver a la liga'}</Link>
              </Badge>
            </div>
          </div>
        </div>
        {tournament.isError && <p role="alert" className="mt-3 text-sm text-red-400">No se pudo cargar el torneo.</p>}
      </HeroCard>

      <div className="my-4 grid grid-cols-3 gap-2 md:my-6 md:gap-4">
        <Tile icon={<Shield className={`${iconCls} text-blue-400`} aria-hidden="true" />} value={standings.data?.data.length ?? 0} label="Equipos" />
        <Tile icon={<Calendar className={`${iconCls} text-purple-400`} aria-hidden="true" />} value={matches.data?.data.length ?? 0} label="Partidos" />
        <Tile icon={<Trophy className={`${iconCls} text-yellow-400`} aria-hidden="true" />} value={t ? tournamentStatus(t.start_date, t.end_date) : '-'} label="Estado" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-white/10 bg-slate-800/50 p-1 sm:grid-cols-4">
          <TabsTrigger value="standings" className={tabTriggerClass}>Tabla</TabsTrigger>
          <TabsTrigger value="matches" className={tabTriggerClass}>Partidos</TabsTrigger>
          <TabsTrigger value="top-scorers" className={tabTriggerClass}>Goleadores</TabsTrigger>
          <TabsTrigger value="discipline" className={tabTriggerClass}>Disciplina</TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="min-h-[300px]">
          <QueryState query={standings} loadingLabel="Cargando tabla…" isEmpty={(res) => res.data.length === 0} empty={<EmptyState title="Aún no hay tabla de posiciones" />}>
            {(res) => <StandingsTable standings={res.data} />}
          </QueryState>
        </TabsContent>

        <TabsContent value="matches" className="min-h-[300px]">
          <QueryState query={matches} loadingLabel="Cargando partidos…" isEmpty={(res) => res.data.length === 0} empty={<EmptyState title="No hay partidos" />}>
            {(res) => <MatchList matches={res.data} teams={teams} />}
          </QueryState>
        </TabsContent>

        <TabsContent value="top-scorers" className="min-h-[300px]">
          <QueryState query={topScorers} loadingLabel="Cargando goleadores…" isEmpty={(res) => res.data.length === 0} empty={<EmptyState title="Aún no hay goleadores" />}>
            {(res) => <TopScorersTable scorers={res.data} />}
          </QueryState>
        </TabsContent>

        <TabsContent value="discipline" className="min-h-[300px]">
          <QueryState query={discipline} loadingLabel="Cargando disciplina…" isEmpty={(res) => res.data.length === 0} empty={<EmptyState title="Sin tarjetas registradas" />}>
            {(res) => <DisciplineTable rows={res.data} />}
          </QueryState>
        </TabsContent>
      </Tabs>
    </PublicPage>
  )
}
