import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, LogIn, Play, Trophy, Users } from 'lucide-react'

import { QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useActiveLeagues } from '@/features/leagues/api'
import { initials } from '@/features/leagues/leagues-page'
import type { League } from '@/features/leagues/types'

import { useTeamsByLeague, useTournamentsByLeague } from '../api'
import { tournamentStatus } from '../format'

/** Page size used to count teams: the list endpoint returns no total. */
const TEAMS_LIMIT = 100

const css = `
@keyframes zg-pulse-slow{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes zg-spin-slow{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes zg-float{0%,100%{transform:translateY(0) translateX(0)}25%{transform:translateY(-20px) translateX(10px)}50%{transform:translateY(-10px) translateX(-5px)}75%{transform:translateY(-30px) translateX(5px)}}
.zg-pulse{animation:zg-pulse-slow 4s ease-in-out infinite}
.zg-spin{animation:zg-spin-slow 20s linear infinite}
.zg-float{animation:zg-float 8s ease-in-out infinite}
@keyframes zg-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.zg-in{animation:zg-in .7s ease-out both}
@media (prefers-reduced-motion: reduce){.zg-pulse,.zg-spin,.zg-float,.zg-in{animation:none}}
`

const arrowBtn =
  'absolute top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/10 hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400'

export function LeagueDirectory() {
  const leagues = useActiveLeagues()
  const [currentIndex, setCurrentIndex] = useState(0)

  const visibleLeagues = leagues.data?.data ?? []
  // The list can shrink after a refetch; never point past its end.
  const index = Math.min(currentIndex, Math.max(visibleLeagues.length - 1, 0))

  const handlePrevious = () => setCurrentIndex(index === 0 ? visibleLeagues.length - 1 : index - 1)
  const handleNext = () => setCurrentIndex(index === visibleLeagues.length - 1 ? 0 : index + 1)
  const fade = (extra = '') => `zg-in ${extra}`

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712] text-white">
      <style>{css}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="zg-pulse absolute left-1/4 top-0 h-[800px] w-[800px] rounded-full bg-emerald-500/[0.07] blur-[150px]" />
        <div className="zg-pulse absolute right-0 top-1/3 h-[600px] w-[600px] rounded-full bg-cyan-500/[0.05] blur-[120px]" />
        <div className="zg-pulse absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-emerald-600/[0.06] blur-[100px]" />
        <div className="zg-pulse absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-blue-500/[0.04] blur-[80px]" />
        <svg className="absolute bottom-0 left-0 h-80 w-full opacity-[0.015]" viewBox="0 0 1400 400" preserveAspectRatio="xMidYMax slice">
          <circle cx="700" cy="450" r="150" fill="none" stroke="white" strokeWidth="3" />
          <line x1="0" y1="250" x2="1400" y2="250" stroke="white" strokeWidth="3" />
          <path d="M 550 450 A 180 180 0 0 1 850 450" fill="none" stroke="white" strokeWidth="3" />
          <rect x="500" y="250" width="400" height="200" fill="none" stroke="white" strokeWidth="3" />
        </svg>
        <div className="zg-float absolute left-[15%] top-20 size-1 rounded-full bg-emerald-400/40" />
        <div className="zg-float absolute left-[55%] top-40 size-1.5 rounded-full bg-cyan-400/30" />
        <div className="zg-float absolute left-[75%] top-60 size-1 rounded-full bg-emerald-300/40" />
        <div className="zg-float absolute left-[35%] top-32 size-0.5 rounded-full bg-white/30" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className={`px-4 pt-3 sm:px-6 lg:px-8 ${fade()}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <Link
              to="/play"
              className="group flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 transition-all duration-300 hover:border-purple-500/40 hover:bg-purple-500/20"
            >
              <span className="rounded bg-purple-500/20 p-1 transition-colors group-hover:bg-purple-500/30">
                <Play className="size-3 text-purple-400" aria-hidden="true" />
              </span>
              <span className="text-xs font-medium text-purple-300 transition-colors group-hover:text-purple-200">Zona Play</span>
            </Link>
            <Link
              to="/login"
              aria-label="Administradores"
              className="group relative flex items-center gap-1.5 overflow-hidden rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 px-3 py-1.5 transition-all duration-300 hover:border-emerald-500/40"
            >
              <LogIn className="relative size-3.5 text-emerald-400" aria-hidden="true" />
              <span className="relative hidden text-xs font-medium text-emerald-300 transition-colors group-hover:text-emerald-200 sm:inline">Administradores</span>
            </Link>
          </div>
        </header>

        <section className="px-4 pb-3 pt-4 sm:px-6 md:pt-6 lg:px-8">
          <div className="mx-auto max-w-7xl text-center">
            <div className={`relative mb-3 inline-block zg-in`}>
              <div className="zg-pulse absolute inset-0 scale-150 rounded-full bg-emerald-500/20 blur-2xl" />
              <div className="relative mx-auto size-20 md:size-24">
                <div className="zg-spin absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-[2px] shadow-xl shadow-emerald-500/30">
                  <div className="size-full rounded-full bg-[#030712]" />
                </div>
                <div className="absolute inset-[2px] flex items-center justify-center rounded-full bg-[#030712]">
                  <img src="/zona-gol.png" alt="" width={72} height={72} className="size-14 object-contain drop-shadow-xl md:size-[4.5rem]" />
                </div>
              </div>
            </div>
            <div className={fade('delay-200')}>
              <h1 className="mb-1 font-[family-name:var(--font-orbitron)] text-3xl font-black tracking-tight md:text-4xl lg:text-5xl">
                <span className="bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">ZONA</span>
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 bg-clip-text text-transparent">-</span>
                <span className="bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">GOL</span>
              </h1>
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-gray-500">Gestión de Ligas de Fútbol</p>
            </div>
            <div className="mb-4 flex items-center justify-center gap-3" aria-hidden="true">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent md:w-16" />
              <Trophy className="size-4 text-emerald-400" />
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent md:w-16" />
            </div>
          </div>
        </section>

        <section className="flex-1 px-4 pb-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className={`mb-4 text-center ${fade('delay-300')}`}>
              <h2 className="mb-0.5 text-lg font-bold text-white md:text-xl">Ligas Disponibles</h2>
              <p className="text-xs text-gray-500">Explora las competiciones activas</p>
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
                            className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 motion-reduce:transition-none ${
                              idx === index ? 'w-6 bg-emerald-500 shadow-md shadow-emerald-500/50' : 'w-1.5 bg-white/20 hover:bg-white/30'
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

        <footer className="py-3 text-center">
          <p className="text-[10px] tracking-wider text-gray-700">© {new Date().getFullYear()} Zona Gol</p>
        </footer>
      </div>
    </div>
  )
}

function EmptyLeagues() {
  return (
    <div className="py-8 text-center">
      <div className="relative mb-4 inline-block">
        <div className="relative flex size-14 items-center justify-center rounded-full border border-white/5 bg-gradient-to-br from-gray-800 to-gray-900">
          <Trophy className="size-6 text-gray-600" aria-hidden="true" />
        </div>
      </div>
      <h3 className="mb-1 text-base font-bold text-white">No hay ligas disponibles</h3>
      <p className="mx-auto mb-4 max-w-xs text-xs text-gray-500">Las ligas aparecerán aquí cuando estén disponibles</p>
      <Link to="/login" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-emerald-400 transition-all duration-300 hover:bg-emerald-500/20">
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
      <div className={`absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/30 via-transparent to-transparent blur-sm transition-opacity duration-500 ${isCurrent ? 'opacity-100' : 'opacity-0'}`} />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl">
        <div className="absolute left-0 top-0 size-12 rounded-tl-2xl border-l-2 border-t-2 border-emerald-500/30" />
        <div className="absolute bottom-0 right-0 size-12 rounded-br-2xl border-b-2 border-r-2 border-emerald-500/30" />
        <div className="absolute right-0 top-0 size-28 bg-gradient-to-bl from-emerald-500/10 to-transparent" />
        <div className="relative p-4 md:p-5">
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <div className="relative shrink-0">
              <div className="zg-pulse absolute inset-0 rounded-full bg-emerald-500/20 blur-lg" />
              <Avatar className="relative size-16 border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/20 md:size-20">
                {league.logo && <AvatarImage src={league.logo} alt="" className="object-cover" />}
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-lg font-black text-white md:text-xl" aria-hidden="true">
                  {initials(league.name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1 text-center md:text-left">
              <div className="mb-1.5 flex items-center justify-center gap-2 md:justify-start">
                <h3 className="truncate text-base font-bold text-white md:text-lg">{league.name}</h3>
                <Badge className="border-emerald-500/30 bg-emerald-500/20 px-2 py-0 text-[10px] text-emerald-400">Activa</Badge>
              </div>
              {league.description && <p className="mb-3 line-clamp-1 text-xs text-gray-400">{league.description}</p>}
              {isCurrent && <LeagueStats leagueId={league.id} />}
              <Link
                to={`/liga/${league.slug}`}
                className="group relative inline-flex h-9 w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 px-5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.02] hover:from-emerald-400 hover:via-emerald-300 hover:to-emerald-400 hover:shadow-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98] md:w-auto"
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
      <div className="text-left">{value}<p className="text-[10px] text-gray-500">{label}</p></div>
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
        <Stat tone="border-blue-500/20 bg-blue-500/20" icon={<Users className="size-3 text-blue-400" aria-hidden="true" />} value={<p className="text-base font-bold leading-none text-white">{teamsCount}</p>} label="Equipos" />
      )}
      {tournamentsCount !== null && (
        <Stat tone="border-purple-500/20 bg-purple-500/20" icon={<Trophy className="size-3 text-purple-400" aria-hidden="true" />} value={<p className="text-base font-bold leading-none text-white">{tournamentsCount}</p>} label="Torneos" />
      )}
      {running && (
        <Stat tone="border-emerald-500/20 bg-emerald-500/20" icon={<Calendar className="size-3 text-emerald-400" aria-hidden="true" />} value={<p className="text-xs font-medium leading-none text-white">{running.name}</p>} label="En curso" />
      )}
    </div>
  )
}
