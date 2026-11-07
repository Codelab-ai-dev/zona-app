import { ArrowLeft, ArrowRight, Trophy } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { EmptyState, QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLeagueBySlug } from '@/features/leagues/api'
import { initials } from '@/features/leagues/leagues-page'
import type { Tournament } from '@/features/leagues/types'

import { useTournamentsByLeague } from '../api'
import { formatDate, tournamentStatus } from '../format'

export function LeagueDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const league = useLeagueBySlug(slug ?? '')
  const tournaments = useTournamentsByLeague(league.data?.id)

  return (
    <section aria-labelledby="league-title" className="mx-auto w-full max-w-6xl px-4 py-8">
      {!league.data && (
        <h1 id="league-title" className="sr-only">
          Liga
        </h1>
      )}
      <QueryState query={league} loadingLabel="Cargando liga…">
        {(leagueData) => (
          <>
            {/* Header */}
            <header className="mb-8 flex items-start gap-4">
              <Link
                to="/"
                className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Volver al inicio"
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </Link>
              <div className="flex flex-1 items-start gap-4">
                <Avatar className="size-16 flex-shrink-0">
                  {leagueData.logo && <AvatarImage src={leagueData.logo} alt="" />}
                  <AvatarFallback>{initials(leagueData.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 id="league-title" className="text-3xl font-bold tracking-tight">
                    {leagueData.name}
                  </h1>
                  <p className="text-muted-foreground line-clamp-2">{leagueData.description}</p>
                </div>
              </div>
            </header>

            {/* Tournaments */}
            <QueryState
              query={tournaments}
              loadingLabel="Cargando torneos…"
              isEmpty={(res) => res.data.length === 0}
              empty={<EmptyState title="Esta liga aún no tiene torneos" />}
            >
              {(tournamentsRes) => (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Torneos</h2>
                  <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {tournamentsRes.data.map((tournament) => (
                      <li key={tournament.id}>
                        <TournamentCard
                          tournament={tournament}
                          leagueSlug={leagueData.slug}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </QueryState>
          </>
        )}
      </QueryState>
    </section>
  )
}

function TournamentCard({
  tournament,
  leagueSlug,
}: {
  tournament: Tournament
  leagueSlug: string
}) {
  const status = tournamentStatus(tournament.start_date, tournament.end_date)
  const statusColor = status === 'Finalizado' ? 'secondary' : status === 'En Curso' ? 'default' : 'outline'

  return (
    <Link
      to={`/liga/${leagueSlug}/torneo/${tournament.id}`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-colors group-hover:border-primary/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate">{tournament.name}</CardTitle>
              <CardDescription className="text-xs">
                {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
              </CardDescription>
            </div>
            <Badge variant={statusColor} className="flex-shrink-0 text-xs">
              {status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Trophy className="size-4" aria-hidden="true" /> Ver torneo
          </span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
        </CardContent>
      </Card>
    </Link>
  )
}
