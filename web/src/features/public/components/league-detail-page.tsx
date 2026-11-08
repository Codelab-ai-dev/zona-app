import { ArrowRight, Calendar, Trophy } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { EmptyState, QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useLeagueBySlug } from '@/features/leagues/api'
import { initials } from '@/features/leagues/leagues-page'
import type { Tournament } from '@/features/leagues/types'

import { useTournamentsByLeague } from '../api'
import { formatDate, tournamentStatus, type TournamentStatus } from '../format'
import { HeroCard, PublicPage } from './public-shell'

const STATUS_CLASS: Record<TournamentStatus, string> = {
  Finalizado: 'border-gray-500/30 bg-gray-500/20 text-gray-400',
  'En Curso': 'border-green-500/30 bg-green-500/20 text-green-400',
  Próximamente: 'border-blue-500/30 bg-blue-500/20 text-blue-400',
}

const FORMAT_LABEL: Record<string, string> = {
  league: 'Liga',
  round_robin: 'Liga',
  knockout: 'Eliminación',
  groups: 'Grupos',
  group_knockout: 'Grupos y eliminación',
}

export function LeagueDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const league = useLeagueBySlug(slug ?? '')
  const tournaments = useTournamentsByLeague(league.data?.id)

  return (
    <PublicPage>
      {!league.data && <h1 className="sr-only">Liga</h1>}
      <QueryState query={league} loadingLabel="Cargando liga…">
        {(leagueData) => (
          <div className="space-y-6">
            <HeroCard>
              <div className="flex flex-col items-center gap-5 md:flex-row">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full bg-green-500/20 blur-lg" />
                  <Avatar className="relative size-20 border-2 border-green-500/30 shadow-lg shadow-green-500/20 md:size-24">
                    {leagueData.logo && <AvatarImage src={leagueData.logo} alt="" className="object-cover" />}
                    <AvatarFallback aria-hidden="true" className="bg-gradient-to-br from-green-500 to-emerald-600 text-xl font-bold text-white md:text-2xl">
                      {initials(leagueData.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1 text-center md:text-left">
                  <h1 className="mb-1 text-2xl font-bold text-white md:text-3xl">{leagueData.name}</h1>
                  {leagueData.description && <p className="mb-3 line-clamp-2 text-sm text-gray-400">{leagueData.description}</p>}
                  <div className="flex items-center justify-center gap-2 md:justify-start">
                    <Badge className="border-green-500/30 bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Liga Activa</Badge>
                    <span className="text-xs text-gray-500">/{leagueData.slug}</span>
                  </div>
                </div>
              </div>
            </HeroCard>

            <section aria-labelledby="tournaments-title">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="size-5 text-green-500" aria-hidden="true" />
                  <h2 id="tournaments-title" className="text-xl font-bold text-white md:text-2xl">Torneos</h2>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-green-500/50 to-transparent" />
              </div>
              <QueryState
                query={tournaments}
                loadingLabel="Cargando torneos…"
                isEmpty={(res) => res.data.length === 0}
                empty={<EmptyState title="Esta liga aún no tiene torneos" description="Los torneos aparecerán aquí cuando se creen" />}
              >
                {(res) => (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {res.data.map((t) => (
                      <li key={t.id}>
                        <TournamentCard tournament={t} leagueSlug={leagueData.slug} />
                      </li>
                    ))}
                  </ul>
                )}
              </QueryState>
            </section>
          </div>
        )}
      </QueryState>
    </PublicPage>
  )
}

function TournamentCard({ tournament, leagueSlug }: { tournament: Tournament; leagueSlug: string }) {
  const status = tournamentStatus(tournament.start_date, tournament.end_date)
  return (
    <Link
      to={`/liga/${leagueSlug}/torneo/${tournament.id}`}
      className="group relative block h-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 shadow-lg transition-all duration-300 hover:border-green-500/30 hover:shadow-xl hover:shadow-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
    >
      <div className="absolute right-0 top-0 h-16 w-16 bg-gradient-to-bl from-green-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-white transition-colors group-hover:text-green-400">{tournament.name}</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
            </p>
          </div>
          <Badge className={`shrink-0 text-xs ${STATUS_CLASS[status]}`}>{status}</Badge>
        </div>
        {tournament.tournament_format && (
          <div className="mb-4 flex items-center gap-1.5">
            <span className="rounded bg-orange-500/20 p-1">
              <Calendar className="size-3 text-orange-400" aria-hidden="true" />
            </span>
            <span className="text-sm text-gray-400">{FORMAT_LABEL[tournament.tournament_format] ?? tournament.tournament_format}</span>
          </div>
        )}
        <span className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-green-500/25 transition-all duration-300 group-hover:from-green-600 group-hover:to-emerald-700">
          Ver Torneo
          <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
