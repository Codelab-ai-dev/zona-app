import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, Users, Calendar, LogIn } from 'lucide-react'

import { QueryState, EmptyState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useActiveLeagues } from '@/features/leagues/api'
import { initials } from '@/features/leagues/leagues-page'
import type { League } from '@/features/leagues/types'

import { useTeamsByLeague, useTournamentsByLeague } from '../api'
import { tournamentStatus } from '../format'

/** Page size used to count teams: the list endpoint returns no total. */
const TEAMS_LIMIT = 100

export function LeagueDirectory() {
  const leagues = useActiveLeagues()
  const [currentIndex, setCurrentIndex] = useState(0)

  const visibleLeagues = leagues.data?.data ?? []
  // The list can shrink after a refetch; never point past its end.
  const index = Math.min(currentIndex, Math.max(visibleLeagues.length - 1, 0))

  const handlePrevious = () => {
    setCurrentIndex(index === 0 ? visibleLeagues.length - 1 : index - 1)
  }

  const handleNext = () => {
    setCurrentIndex(index === visibleLeagues.length - 1 ? 0 : index + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Decorative background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/[0.08] rounded-full blur-[100px] motion-reduce:opacity-0"
          aria-hidden="true"
          style={{ animation: 'none' }}
        />
        <div
          className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-cyan-500/[0.06] rounded-full blur-[80px] motion-reduce:opacity-0"
          aria-hidden="true"
          style={{ animation: 'none' }}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/zona-gol.png" alt="" width={32} height={32} className="h-8 w-8" />
              <span className="text-xl font-bold text-white">Zona Gol</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="text-sm text-slate-400 hover:text-emerald-400 transition-colors hidden sm:block"
              >
                Inicio
              </Link>
              <Button asChild size="sm" variant="outline">
                <Link to="/login">
                  <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Administradores</span>
                  <span className="sm:hidden">Admin</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="mx-auto w-full max-w-6xl text-center">
            <h1 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              <span className="text-emerald-400">Zona</span>
              <span className="text-white">-Gol</span>
            </h1>
            <p className="mt-3 text-sm text-slate-400 sm:text-base">Gestión de Ligas de Fútbol</p>
          </div>
        </section>

        {/* Leagues Section */}
        <section className="flex-1 px-4 sm:px-6 lg:px-8 pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="mb-4 text-center text-xl font-bold text-white sm:text-2xl">Ligas Disponibles</h2>
            <p className="mb-6 text-center text-sm text-slate-400">Explora las competiciones activas</p>

            <QueryState
              query={leagues}
              loadingLabel="Cargando ligas…"
              isEmpty={(res) => res.data.length === 0}
              empty={
                <EmptyState
                  title="No hay ligas disponibles"
                  description="Las ligas aparecerán aquí cuando estén disponibles"
                />
              }
            >
              {() =>
                visibleLeagues.length === 0 ? (
                  <EmptyState
                    title="No hay ligas disponibles"
                    description="Las ligas aparecerán aquí cuando estén disponibles"
                  />
                ) : (
                  <div className="relative" role="region" aria-roledescription="carousel" aria-label="Ligas disponibles">
                    <div className="relative px-4 sm:px-8 md:px-12">
                      <div className="overflow-hidden">
                        <div
                          className="flex transition-transform duration-500 motion-reduce:transition-none"
                          style={{ transform: `translateX(-${index * 100}%)` }}
                          aria-live="polite"
                        >
                          {visibleLeagues.map((league, idx) => (
                            <div
                              key={league.id}
                              role="group"
                              aria-roledescription="slide"
                              aria-label={`${idx + 1} de ${visibleLeagues.length}`}
                              inert={idx !== index}
                              className="w-full shrink-0"
                            >
                              <LeagueCard league={league} isCurrent={idx === index} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {visibleLeagues.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={handlePrevious}
                            aria-label="Liga anterior"
                            className="absolute left-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 bg-slate-800/50 text-white transition-colors hover:border-emerald-500/50 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                          >
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNext}
                            aria-label="Siguiente liga"
                            className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 bg-slate-800/50 text-white transition-colors hover:border-emerald-500/50 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                          >
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>

                    {visibleLeagues.length > 1 && (
                      <div className="mt-6 flex justify-center gap-2">
                        {visibleLeagues.map((league, idx) => (
                          <button
                            type="button"
                            key={league.id}
                            onClick={() => setCurrentIndex(idx)}
                            aria-label={`Ir a ${league.name}`}
                            aria-current={idx === index ? 'true' : undefined}
                            className={`h-2 rounded-full transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                              idx === index ? 'w-6 bg-emerald-500' : 'w-2 bg-white/30 hover:bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              }
            </QueryState>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-slate-900/50 px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Zona Gol
          </div>
        </footer>
      </div>
    </div>
  )
}

/**
 * Team count and running tournament are fetched only for the slide in view
 * (`isCurrent`), so the directory never fires requests for every league.
 */
function LeagueCard({ league, isCurrent }: { league: League; isCurrent: boolean }) {
  return (
    <Card className="mx-auto max-w-md overflow-hidden border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0 border-2 border-emerald-500/30">
              {league.logo && <AvatarImage src={league.logo} alt="" />}
              <AvatarFallback className="bg-emerald-600 font-bold text-white" aria-hidden="true">
                {initials(league.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-bold text-white">{league.name}</h3>
              {league.description && <p className="line-clamp-1 text-xs text-slate-400">{league.description}</p>}
            </div>
          </div>

          {isCurrent && <LeagueStats leagueId={league.id} />}

          <Button asChild className="mt-2 w-full bg-emerald-600 text-white hover:bg-emerald-700">
            <Link to={`/liga/${league.slug}`}>
              Ver Liga
              <span className="sr-only">: {league.name}</span>
              <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function LeagueStats({ leagueId }: { leagueId: string }) {
  const teams = useTeamsByLeague(leagueId)
  const tournaments = useTournamentsByLeague(leagueId)

  // The teams endpoint returns no total: a full page means "at least that many".
  const teamsCount = teams.data
    ? (teams.data.page.total ?? (teams.data.data.length >= TEAMS_LIMIT ? `${TEAMS_LIMIT}+` : teams.data.data.length))
    : null
  const running = tournaments.data?.data.find((t) => tournamentStatus(t.start_date, t.end_date) === 'En Curso')

  if (teamsCount === null && !running) return null
  return (
    <div className="space-y-2">
      {teamsCount !== null && (
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
            <Users className="h-4 w-4 text-blue-400" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-white">{teamsCount}</p>
            <p className="text-xs text-slate-400">Equipos</p>
          </div>
        </div>
      )}
      {running && (
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
            <Calendar className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium text-white">{running.name}</p>
            <p className="text-xs text-slate-400">En curso</p>
          </div>
        </div>
      )}
    </div>
  )
}
