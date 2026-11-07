import { ArrowLeft } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { EmptyState, QueryState } from '@/components/states'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLeagueBySlug } from '@/features/leagues/api'

import { useDiscipline, useStandings, useTopScorers, useTournament, useTournamentMatches } from '../api'
import { formatDate } from '../format'
import { MatchList, type TeamLookup } from './match-list'
import { DisciplineTable, StandingsTable, TopScorersTable } from './stats-tables'

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

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <Link to={`/liga/${slug}`} className="inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> {league.data?.name ?? 'Volver a la liga'}
        </Link>
        <h1 className="text-3xl font-bold">{tournament.data?.name ?? 'Torneo'}</h1>
        {tournament.data && (
          <p className="text-sm text-muted-foreground">
            {formatDate(tournament.data.start_date)} - {formatDate(tournament.data.end_date)}
          </p>
        )}
        {tournament.isError && <p role="alert" className="text-sm text-destructive">No se pudo cargar el torneo.</p>}
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="standings">Tabla</TabsTrigger>
          <TabsTrigger value="matches">Partidos</TabsTrigger>
          <TabsTrigger value="top-scorers">Goleadores</TabsTrigger>
          <TabsTrigger value="discipline">Disciplina</TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="mt-6">
          <QueryState
            query={standings}
            loadingLabel="Cargando tabla…"
            isEmpty={(res) => res.data.length === 0}
            empty={<EmptyState title="Aún no hay tabla de posiciones" />}
          >
            {(res) => <StandingsTable standings={res.data} />}
          </QueryState>
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <QueryState
            query={matches}
            loadingLabel="Cargando partidos…"
            isEmpty={(res) => res.data.length === 0}
            empty={<EmptyState title="No hay partidos" />}
          >
            {(res) => <MatchList matches={res.data} teams={teams} />}
          </QueryState>
        </TabsContent>

        <TabsContent value="top-scorers" className="mt-6">
          <QueryState
            query={topScorers}
            loadingLabel="Cargando goleadores…"
            isEmpty={(res) => res.data.length === 0}
            empty={<EmptyState title="Aún no hay goleadores" />}
          >
            {(res) => <TopScorersTable scorers={res.data} />}
          </QueryState>
        </TabsContent>

        <TabsContent value="discipline" className="mt-6">
          <QueryState
            query={discipline}
            loadingLabel="Cargando disciplina…"
            isEmpty={(res) => res.data.length === 0}
            empty={<EmptyState title="Sin tarjetas registradas" />}
          >
            {(res) => <DisciplineTable rows={res.data} />}
          </QueryState>
        </TabsContent>
      </Tabs>
    </section>
  )
}
