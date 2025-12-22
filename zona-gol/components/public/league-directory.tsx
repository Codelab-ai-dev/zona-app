"use client"

import Link from "next/link"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Trophy, ArrowRight, Loader2, LogIn, Users, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { useLeagues } from "@/lib/hooks/use-leagues"

interface LeagueStats {
  teamsCount: number
  tournamentsCount: number
  activeTournament: any | null
}

interface League {
  id: string
  name: string
  slug: string
  description: string
  logo: string | null
  is_active: boolean
  created_at: string
}

interface InitialData {
  leagues: League[]
  leagueStats: Record<string, LeagueStats>
}

interface LeagueDirectoryProps {
  initialData?: InitialData
}

export function LeagueDirectory({ initialData }: LeagueDirectoryProps) {
  const { getActiveLeagues, getLeagueStats, loading: hookLoading, error, leagues: hookLeagues } = useLeagues()
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  const [leagueStats, setLeagueStats] = useState<Record<string, LeagueStats>>(
    initialData?.leagueStats || {}
  )

  const leagues = initialData?.leagues || hookLeagues
  const loading = initialData ? false : hookLoading

  const activeLeagues = useMemo(() => {
    return leagues?.filter(league => league.is_active) || []
  }, [leagues])

  useEffect(() => {
    if (initialData) return

    getActiveLeagues().catch(() => {})

    const handleLeagueUpdate = () => {
      getActiveLeagues().catch(() => {})
    }

    window.addEventListener('league-status-updated', handleLeagueUpdate)
    return () => window.removeEventListener('league-status-updated', handleLeagueUpdate)
  }, [initialData])

  useEffect(() => {
    if (initialData) return

    const loadStats = async () => {
      if (!hookLeagues || hookLeagues.length === 0) {
        setLeagueStats({})
        return
      }

      const currentActiveLeagues = hookLeagues.filter(league => league.is_active)
      if (currentActiveLeagues.length === 0) {
        setLeagueStats({})
        return
      }

      try {
        const statsPromises = currentActiveLeagues.map(async (league) => {
          const leagueStat = await getLeagueStats(league.id)
          return { leagueId: league.id, stats: leagueStat }
        })

        const results = await Promise.all(statsPromises)
        const stats: Record<string, LeagueStats> = {}
        results.forEach(({ leagueId, stats: leagueStat }) => {
          stats[leagueId] = leagueStat
        })
        setLeagueStats(stats)
      } catch (error) {
        // console.error('Error loading league stats:', error)
      }
    }

    loadStats()
  }, [hookLeagues, initialData])

  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  const getLeagueInitials = (leagueName: string) => {
    return leagueName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Fondo con elementos deportivos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Líneas diagonales dinámicas */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-0 right-0 w-1/3 h-screen bg-gradient-to-bl from-green-500/10 via-transparent to-transparent transform skew-x-12" />
          <div className="absolute bottom-0 left-0 w-1/4 h-screen bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent transform -skew-x-12" />
        </div>
        {/* Círculos decorativos */}
        <div className="absolute top-10 right-10 w-48 h-48 bg-green-500/5 rounded-full blur-2xl" />
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header con Login - Solo visible en desktop */}
        <header className="hidden md:block pt-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex justify-end">
            <Button
              asChild
              size="sm"
              className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-4 py-2 rounded-lg shadow-lg shadow-green-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/30 hover:scale-105"
            >
              <Link href="/login" className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span className="text-sm">Acceso Administradores</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-8 md:pt-6 pb-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            {/* Logo y título con efecto dinámico */}
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 blur-3xl opacity-20 animate-pulse" />
              <div className="relative flex flex-col md:flex-row items-center justify-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                  <img
                    src="/zona-gol.png"
                    alt="Zona Gol Logo"
                    className="relative w-24 h-24 md:w-24 md:h-24 drop-shadow-2xl"
                  />
                </div>
                <h1
                  className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-300 tracking-tight"
                  style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
                >
                  ZONA-GOL
                </h1>
              </div>
            </div>

            {/* Botón de acceso - Solo visible en móvil */}
            <div className="md:hidden mb-4">
              <Button
                asChild
                size="sm"
                className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-4 py-2 rounded-lg shadow-lg shadow-green-500/25"
              >
                <Link href="/login" className="flex items-center gap-2">
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="text-sm">Acceso Administradores</span>
                </Link>
              </Button>
            </div>

            {/* Separador dinámico */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
              <Trophy className="w-5 h-5 text-green-500" />
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
            </div>
          </div>
        </section>

        {/* Sección de Ligas */}
        <section className="flex-1 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Título de sección */}
            <div className="text-center mb-5">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                Ligas Disponibles
              </h2>
              <p className="text-gray-400 text-sm">
                Explora las competiciones activas
              </p>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                  <Loader2 className="relative w-8 h-8 animate-spin text-green-500" />
                </div>
                <p className="mt-3 text-gray-400 text-sm">Cargando ligas...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <p className="text-red-400 text-sm">Error al cargar las ligas: {error}</p>
              </div>
            )}

            {!loading && activeLeagues.length === 0 && (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-800 mb-4">
                  <Trophy className="w-7 h-7 text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  No hay ligas disponibles
                </h3>
                <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
                  Las ligas aparecerán aquí cuando estén disponibles públicamente
                </p>
                <Button asChild variant="outline" size="sm" className="border-green-500/50 text-green-400 hover:bg-green-500/10">
                  <Link href="/login" className="flex items-center gap-2">
                    <LogIn className="w-3 h-3" />
                    Acceder al Panel
                  </Link>
                </Button>
              </div>
            )}

            {/* Carousel de Ligas */}
            {activeLeagues.length > 0 && (
              <div className="relative px-4 md:px-12">
                <Carousel
                  setApi={setApi}
                  opts={{
                    align: "center",
                    loop: activeLeagues.length > 1,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-3">
                    {activeLeagues.map((league, index) => {
                      const stats = leagueStats[league.id] || { teamsCount: 0, tournamentsCount: 0, activeTournament: null }
                      const isActive = index === current

                      return (
                        <CarouselItem
                          key={league.id}
                          className="pl-3 md:basis-4/5 lg:basis-3/5"
                        >
                          <div
                            className={`relative transition-all duration-500 ${
                              isActive ? 'scale-100 opacity-100' : 'scale-90 opacity-50'
                            }`}
                          >
                            {/* Card de Liga */}
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                              {/* Decoración angular superior */}
                              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/20 to-transparent transform rotate-12 translate-x-6 -translate-y-6" />

                              <div className="relative p-5 md:p-7">
                                <div className="flex flex-col md:flex-row items-center gap-5">
                                  {/* Logo de la liga */}
                                  <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-green-500/20 rounded-full blur-lg" />
                                    <Avatar className="relative w-20 h-20 md:w-24 md:h-24 border-2 border-green-500/30 shadow-lg shadow-green-500/20">
                                      {league.logo && (
                                        <AvatarImage src={league.logo} alt={league.name} className="object-cover" />
                                      )}
                                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xl md:text-2xl font-bold">
                                        {getLeagueInitials(league.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>

                                  {/* Info de la liga */}
                                  <div className="flex-1 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                      <h3 className="text-lg md:text-xl font-bold text-white">
                                        {league.name}
                                      </h3>
                                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2 py-0.5">
                                        Activa
                                      </Badge>
                                    </div>

                                    {league.description && (
                                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                        {league.description}
                                      </p>
                                    )}

                                    {/* Stats */}
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 mb-4">
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-blue-500/20">
                                          <Users className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                          <p className="text-lg font-bold text-white">{stats.teamsCount}</p>
                                          <p className="text-xs text-gray-500">Equipos</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-purple-500/20">
                                          <Trophy className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div>
                                          <p className="text-lg font-bold text-white">{stats.tournamentsCount}</p>
                                          <p className="text-xs text-gray-500">Torneos</p>
                                        </div>
                                      </div>
                                      {stats.activeTournament && (
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 rounded-lg bg-green-500/20">
                                            <Calendar className="w-4 h-4 text-green-400" />
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-white">{stats.activeTournament.name}</p>
                                            <p className="text-xs text-gray-500">Torneo Activo</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Botón de acción */}
                                    <Button
                                      asChild
                                      className="group w-full md:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md shadow-green-500/25 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/30"
                                    >
                                      <Link href={`/liga/${league.slug}`} className="flex items-center justify-center gap-2">
                                        <span>Ver Liga</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Decoración angular inferior */}
                              <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-emerald-500/10 to-transparent transform -rotate-12 -translate-x-5 translate-y-5" />
                            </div>
                          </div>
                        </CarouselItem>
                      )
                    })}
                  </CarouselContent>

                  {/* Controles del Carousel */}
                  {activeLeagues.length > 1 && (
                    <>
                      <CarouselPrevious className="absolute left-0 md:-left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-800/80 border-white/10 text-white hover:bg-slate-700 hover:text-green-400 backdrop-blur-sm">
                        <ChevronLeft className="w-5 h-5" />
                      </CarouselPrevious>
                      <CarouselNext className="absolute right-0 md:-right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-800/80 border-white/10 text-white hover:bg-slate-700 hover:text-green-400 backdrop-blur-sm">
                        <ChevronRight className="w-5 h-5" />
                      </CarouselNext>
                    </>
                  )}
                </Carousel>

                {/* Indicadores de posición */}
                {activeLeagues.length > 1 && (
                  <div className="flex justify-center gap-2 mt-5">
                    {activeLeagues.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => api?.scrollTo(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          index === current
                            ? 'w-6 bg-green-500'
                            : 'w-2 bg-gray-600 hover:bg-gray-500'
                        }`}
                        aria-label={`Ir a liga ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto py-3">
          <div className="text-center">
            <p className="text-gray-700 text-[10px]">
              © {new Date().getFullYear()} Zona Gol
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
