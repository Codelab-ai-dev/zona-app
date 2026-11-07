import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronLeft, ChevronRight, Users, Calendar, LogIn } from 'lucide-react'

import { QueryState, EmptyState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useActiveLeagues } from '@/features/leagues/api'
import type { League } from '@/features/leagues/types'

import type { Tournament } from '@/features/leagues/types'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function LeagueDirectory() {
  const navigate = useNavigate()
  const leagues = useActiveLeagues()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [leagueStats, setLeagueStats] = useState<Record<string, { teamsCount: number | null; activeTournament: Tournament | null }>>({})

  const visibleLeagues = useMemo(() => leagues.data?.data || [], [leagues.data?.data])

  // Fetch stats for each league
  useEffect(() => {
    if (!visibleLeagues.length) return

    const fetchStats = async () => {
      const newStats: typeof leagueStats = {}

      for (const league of visibleLeagues) {
        try {
          let teamsCount: number | null = null
          // Fetch teams count
          const teamsRes = await fetch(
            `/api/v1/teams?league_id=${league.id}&limit=100`,
            { signal: AbortSignal.timeout(5000) }
          )
          if (teamsRes.ok) {
            const teamsData = await teamsRes.json()
            // Use page.total if available, otherwise only show count if we got less than limit (meaning no truncation)
            if (teamsData.page?.total !== undefined) {
              teamsCount = teamsData.page.total
            } else if (teamsData.data?.length && teamsData.data.length < 100) {
              teamsCount = teamsData.data.length
            }
          }

          // Fetch tournaments to find active one
          const toursRes = await fetch(
            `/api/v1/leagues/${league.id}/tournaments?limit=100`,
            { signal: AbortSignal.timeout(5000) }
          )
          let activeTournament: Tournament | null = null
          if (toursRes.ok) {
            const toursData = await toursRes.json()
            const tournaments: Tournament[] = toursData.data || []
            const now = new Date()
            activeTournament = tournaments.find((t: Tournament) => {
              const start = new Date(t.start_date)
              const end = new Date(t.end_date)
              return now >= start && now <= end
            }) || null
          }

          newStats[league.id] = {
            teamsCount,
            activeTournament,
          }
        } catch {
          newStats[league.id] = {
            teamsCount: null,
            activeTournament: null,
          }
        }
      }

      setLeagueStats(newStats)
    }

    fetchStats()
  }, [visibleLeagues])

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? visibleLeagues.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === visibleLeagues.length - 1 ? 0 : prev + 1))
  }

  const handleLeagueClick = (slug: string) => {
    navigate(`/liga/${slug}`)
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
                  <div className="relative">
                    {/* Carousel */}
                    <div className="relative px-4 sm:px-8 md:px-12">
                      {/* Cards Container */}
                      <div className="overflow-hidden">
                        <div
                          className="flex transition-transform duration-500"
                          style={{
                            transform: `translateX(-${currentIndex * 100}%)`,
                          }}
                        >
                          {visibleLeagues.map((league) => {
                            const stats = leagueStats[league.id] || { teamsCount: 0, activeTournament: null }
                            return (
                              <div key={league.id} className="w-full flex-shrink-0">
                                <LeagueCard
                                  league={league}
                                  teamsCount={stats.teamsCount}
                                  activeTournament={stats.activeTournament}
                                  onNavigate={handleLeagueClick}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Navigation buttons */}
                      {visibleLeagues.length > 1 && (
                        <>
                          <button
                            onClick={handlePrevious}
                            aria-label="Anterior liga"
                            className="absolute left-0 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-800/50 text-white hover:border-emerald-500/50 hover:bg-slate-800 transition-colors disabled:opacity-50"
                          >
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <button
                            onClick={handleNext}
                            aria-label="Siguiente liga"
                            className="absolute right-0 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-800/50 text-white hover:border-emerald-500/50 hover:bg-slate-800 transition-colors disabled:opacity-50"
                          >
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Pagination dots */}
                    {visibleLeagues.length > 1 && (
                      <div className="mt-6 flex justify-center gap-2">
                        {visibleLeagues.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            aria-label={`Ir a liga ${idx + 1}`}
                            className={`h-2 rounded-full transition-all ${
                              idx === currentIndex ? 'w-6 bg-emerald-500' : 'w-2 bg-white/20 hover:bg-white/30'
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

function LeagueCard({
  league,
  teamsCount,
  activeTournament,
  onNavigate,
}: {
  league: League
  teamsCount: number | null
  activeTournament: Tournament | null
  onNavigate: (slug: string) => void
}) {
  return (
    <Card className="border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 mx-auto max-w-md overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          {/* Logo and Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-emerald-500/30">
              {league.logo && <AvatarImage src={league.logo} alt="" />}
              <AvatarFallback className="bg-emerald-600 text-white font-bold">
                {initials(league.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{league.name}</h3>
              {league.description && (
                <p className="text-xs text-slate-400 line-clamp-1">{league.description}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          {(teamsCount !== null || activeTournament) && (
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
              {activeTournament && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                    <Calendar className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{activeTournament.name}</p>
                    <p className="text-xs text-slate-400">En curso</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Button */}
          <Button
            onClick={() => onNavigate(league.slug)}
            className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Ver Liga
            <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
