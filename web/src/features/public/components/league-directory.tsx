import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, LogIn, Play, Trophy, Users } from 'lucide-react'

import { sportModules } from '@/components/brand/sport-modules'
import { ZonaGolLogo, ZonaOSLogo, ZonaSymbol } from '@/components/brand/zona-logo'
import { QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useActiveLeagues } from '@/features/leagues/api'
import { initials } from '@/features/leagues/leagues-page'
import type { League } from '@/features/leagues/types'
import { useAuth } from '@/lib/auth/auth-context'

import { useTeamsByLeague, useTournamentsByLeague } from '../api'
import { tournamentStatus } from '../format'

/** Page size used to count teams: the list endpoint returns no total. */
const TEAMS_LIMIT = 100

const css = `
@keyframes zg-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.zg-in{animation:zg-in .45s cubic-bezier(.2,.8,.2,1) both}
@media (prefers-reduced-motion: reduce){.zg-in{animation:none}}
`

const arrowBtn =
  'absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-white transition-colors duration-150 hover:border-gol-400/50 hover:text-gol-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gol-400 size-10'

export function LeagueDirectory() {
  const leagues = useActiveLeagues()
  const { status } = useAuth()
  const { pathname } = useLocation()
  const [currentIndex, setCurrentIndex] = useState(0)

  const visibleLeagues = leagues.data?.data ?? []
  // The list can shrink after a refetch; never point past its end.
  const index = Math.min(currentIndex, Math.max(visibleLeagues.length - 1, 0))

  const handlePrevious = () => setCurrentIndex(index === 0 ? visibleLeagues.length - 1 : index - 1)
  const handleNext = () => setCurrentIndex(index === visibleLeagues.length - 1 ? 0 : index + 1)
  // Signed-in visitors of the home go straight to their dashboard (never while the session is loading).
  if (pathname === '/' && status === 'authenticated') return <Navigate to="/dashboard" replace />
  const fade = (extra = '') => `zg-in ${extra}`

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <style>{css}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[960px] -translate-x-1/2 rounded-full bg-gol-400/[0.07] blur-[140px]" />
        <div className="zona-grid absolute inset-x-0 top-0 h-[640px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <ZonaSymbol className="absolute -right-32 top-24 hidden h-[520px] opacity-[0.05] lg:block" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className={`px-4 pt-4 sm:px-6 lg:px-8 ${fade()}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <Link to="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gol-400">
              <ZonaOSLogo size="sm" className="sm:hidden" />
              <ZonaOSLogo size="md" descriptor className="hidden sm:inline-flex" />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/play"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-700 px-3 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gol-400"
              >
                <Play className="size-3.5" aria-hidden="true" />
                Zona Play
              </Link>
              <Link
                to="/login"
                aria-label="Administradores"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-gol-400 px-3 text-xs font-semibold text-slate-950 transition-colors hover:bg-gol-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gol-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <LogIn className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Administradores</span>
              </Link>
            </div>
          </div>
        </header>

        <section className="px-4 pb-6 pt-12 sm:px-6 md:pt-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className={`mb-8 flex flex-col items-center gap-3 ${fade()}`}>
              <ZonaGolLogo className="max-w-[300px] md:max-w-[368px]" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-400">
                <ZonaSymbol className="h-3" />
                Módulo de fútbol de Zona OS
              </span>
            </div>
            <h1 className={`text-balance font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] md:text-6xl ${fade('[animation-delay:80ms]')}`}>
              Tu liga, <span className="gol-text-gradient">siempre al día</span>.
            </h1>
            <p className={`mx-auto mt-4 max-w-xl text-base text-slate-400 md:text-lg ${fade('[animation-delay:160ms]')}`}>
              Calendario, resultados, tabla de posiciones y estadísticas de las ligas que operan en Zona OS.
            </p>
            <ul className={`mt-8 flex flex-wrap items-center justify-center gap-2 ${fade('[animation-delay:240ms]')}`} aria-label="Deportes en Zona OS">
              {sportModules.map(({ id, sport, status, Icon }) => (
                <li
                  key={id}
                  className={
                    status === 'active'
                      ? 'inline-flex items-center gap-2 rounded-xl border border-gol-400/30 bg-slate-900 px-3 py-2 text-sm font-medium text-white'
                      : 'inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-500'
                  }
                >
                  <Icon className={status === 'active' ? 'size-4 text-gol-400' : 'size-4'} />
                  {sport}
                  {status !== 'active' && <span className="text-[11px] text-slate-500">· próximamente</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex-1 px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className={`mb-5 flex items-end justify-between gap-4 border-b border-slate-800 pb-3 ${fade('[animation-delay:300ms]')}`}>
              <div>
                <h2 className="text-lg font-bold text-white md:text-xl">Ligas disponibles</h2>
                <p className="text-sm text-slate-400">Explora las competiciones activas</p>
              </div>
            </div>

            <QueryState
              query={leagues}
              loadingLabel="Cargando ligas…"
              isEmpty={(res) => res.data.length === 0}
              empty={<EmptyLeagues />}
            >
              {() =>
                visibleLeagues.length === 0 ? (
                  <EmptyLeagues />
                ) : (
                  <div className="relative" role="region" aria-roledescription="carousel" aria-label="Ligas disponibles">
                    <div className="relative px-2 md:px-12">
                      <div className="overflow-hidden">
                        <div
                          className="flex transition-transform duration-500 [--b:100] motion-reduce:transition-none md:[--b:80] lg:[--b:60]"
                          style={{ transform: `translateX(calc(50% - var(--b) * 1% * ${index + 0.5}))` }}
                          aria-live="polite"
                        >
                          {visibleLeagues.map((league, idx) => (
                            <div
                              key={league.id}
                              role="group"
                              aria-roledescription="slide"
                              aria-label={`${idx + 1} de ${visibleLeagues.length}`}
                              inert={idx !== index}
                              className="shrink-0 basis-full pl-3 md:basis-4/5 lg:basis-3/5"
                            >
                              <LeagueCard league={league} isCurrent={idx === index} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {visibleLeagues.length > 1 && (
                        <>
                          <button type="button" onClick={handlePrevious} aria-label="Liga anterior" className={`${arrowBtn} left-0 md:-left-0`}>
                            <ChevronLeft className="size-4" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={handleNext} aria-label="Siguiente liga" className={`${arrowBtn} right-0`}>
                            <ChevronRight className="size-4" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>

                    {visibleLeagues.length > 1 && (
                      <div className="mt-4 flex justify-center gap-1.5">
                        {visibleLeagues.map((league, idx) => (
                          <button
                            type="button"
                            key={league.id}
                            onClick={() => setCurrentIndex(idx)}
                            aria-label={`Ir a ${league.name}`}
                            aria-current={idx === index ? 'true' : undefined}
                            className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gol-400 motion-reduce:transition-none ${
                              idx === index ? 'w-6 bg-gol-400' : 'w-1.5 bg-slate-600 hover:bg-slate-500'
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

        <footer className="border-t border-slate-900 py-5 text-center">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Zona OS · Plataforma operativa</p>
        </footer>
      </div>
    </div>
  )
}

function EmptyLeagues() {
  return (
    <div className="py-8 text-center">
      <div className="relative mb-4 inline-block">
        <div className="relative flex size-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
          <Trophy className="size-6 text-slate-500" aria-hidden="true" />
        </div>
      </div>
      <h3 className="mb-1 text-base font-bold text-white">No hay ligas disponibles</h3>
      <p className="mx-auto mb-4 max-w-xs text-sm text-slate-400">Las ligas aparecerán aquí cuando estén disponibles</p>
      <Link to="/login" className="inline-flex items-center gap-1.5 min-h-10 rounded-xl bg-gol-400 px-4 text-slate-950 transition-colors hover:bg-gol-300">
        <LogIn className="size-3.5" aria-hidden="true" />
        <span className="text-xs font-medium">Acceder al Panel</span>
      </Link>
    </div>
  )
}

/**
 * Team count and running tournament are fetched only for the slide in view
 * (`isCurrent`), so the directory never fires requests for every league.
 */
function LeagueCard({ league, isCurrent }: { league: League; isCurrent: boolean }) {
  return (
    <div className={`relative transition-all duration-500 motion-reduce:transition-none ${isCurrent ? 'scale-100 opacity-100' : 'scale-95 opacity-40'}`}>
      <div className={`relative overflow-hidden rounded-[20px] border bg-slate-900 transition-colors duration-300 ${isCurrent ? 'border-gol-400/30 shadow-[0_24px_60px_-30px_rgb(163_255_18/0.35)]' : 'border-slate-800'}`}>
        <div className="gol-stripes absolute inset-y-0 right-0 w-1/2 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden="true" />
        <div className="relative p-4 md:p-5">
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <div className="relative shrink-0">
              <Avatar className="relative size-16 rounded-2xl border border-slate-700 md:size-20">
                {league.logo && <AvatarImage src={league.logo} alt="" className="object-cover" />}
                <AvatarFallback className="rounded-2xl gol-gradient font-display text-lg font-extrabold text-slate-950 md:text-xl" aria-hidden="true">
                  {initials(league.name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1 text-center md:text-left">
              <div className="mb-1.5 flex items-center justify-center gap-2 md:justify-start">
                <h3 className="truncate text-lg font-bold text-white md:text-xl">{league.name}</h3>
                <Badge className="gap-1 rounded-full border-gol-400/30 bg-gol-400/10 px-2 py-0 text-[11px] text-gol-300"><span className="size-1.5 rounded-full bg-gol-400" aria-hidden="true" />Activa</Badge>
              </div>
              {league.description && <p className="mb-3 line-clamp-1 text-sm text-slate-400">{league.description}</p>}
              {isCurrent && <LeagueStats leagueId={league.id} />}
              <Link
                to={`/liga/${league.slug}`}
                className="group relative inline-flex h-11 w-full items-center justify-center rounded-xl bg-gol-400 px-5 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-gol-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gol-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 md:w-auto"
              >
                <span className="relative">Ver Liga<span className="sr-only">: {league.name}</span></span>
                <ArrowRight className="relative ml-2 size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, tone, value, label }: { icon: React.ReactNode; tone: string; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-lg border p-1.5 ${tone}`}>{icon}</div>
      <div className="text-left">{value}<p className="text-[11px] text-slate-400">{label}</p></div>
    </div>
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
  const tournamentsCount = tournaments.data?.data.length ?? null

  if (teamsCount === null && tournamentsCount === null) return null
  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-4 md:justify-start">
      {teamsCount !== null && (
        <Stat tone="border-slate-700 bg-slate-800" icon={<Users className="size-3.5 text-slate-300" aria-hidden="true" />} value={<p className="tabular text-base font-bold leading-none text-white">{teamsCount}</p>} label="Equipos" />
      )}
      {tournamentsCount !== null && (
        <Stat tone="border-gol-500/25 bg-gol-500/10" icon={<Trophy className="size-3.5 text-gol-300" aria-hidden="true" />} value={<p className="tabular text-base font-bold leading-none text-white">{tournamentsCount}</p>} label="Torneos" />
      )}
      {running && (
        <Stat tone="border-gol-400/25 bg-gol-400/10" icon={<Calendar className="size-3.5 text-gol-400" aria-hidden="true" />} value={<p className="text-xs font-medium leading-none text-white">{running.name}</p>} label="En curso" />
      )}
    </div>
  )
}
