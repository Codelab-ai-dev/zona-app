"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
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
import { Trophy, ArrowRight, Loader2, LogIn, Users, Calendar, ChevronLeft, ChevronRight, Play } from "lucide-react"
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
  const router = useRouter()
  const { getActiveLeagues, getLeagueStats, loading: hookLoading, error, leagues: hookLeagues } = useLeagues()
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [navigating, setNavigating] = useState<string | null>(null)

  const [leagueStats, setLeagueStats] = useState<Record<string, LeagueStats>>(
    initialData?.leagueStats || {}
  )

  const leagues = initialData?.leagues || hookLeagues
  const loading = initialData ? false : hookLoading

  const activeLeagues = useMemo(() => {
    return leagues?.filter(league => league.is_active) || []
  }, [leagues])

  useEffect(() => {
    setMounted(true)
  }, [])

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
        // Silent error
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
    <div className="min-h-screen bg-[#030712] overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stadium light orbs */}
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-emerald-500/[0.07] rounded-full blur-[150px] animate-pulse-slow" />
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-cyan-500/[0.05] rounded-full blur-[120px] animate-pulse-slower" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/[0.06] rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.04] rounded-full blur-[80px] animate-pulse-slower" />

        {/* Field lines SVG */}
        <svg className="absolute bottom-0 left-0 w-full h-80 opacity-[0.015]" viewBox="0 0 1400 400" preserveAspectRatio="xMidYMax slice">
          <circle cx="700" cy="450" r="150" fill="none" stroke="white" strokeWidth="3"/>
          <line x1="0" y1="250" x2="1400" y2="250" stroke="white" strokeWidth="3"/>
          <path d="M 550 450 A 180 180 0 0 1 850 450" fill="none" stroke="white" strokeWidth="3"/>
          <rect x="500" y="250" width="400" height="200" fill="none" stroke="white" strokeWidth="3"/>
        </svg>

        {/* Floating particles */}
        <div className="absolute top-20 left-[15%] w-1 h-1 bg-emerald-400/40 rounded-full animate-float-1" />
        <div className="absolute top-40 left-[55%] w-1.5 h-1.5 bg-cyan-400/30 rounded-full animate-float-2" />
        <div className="absolute top-60 left-[75%] w-1 h-1 bg-emerald-300/40 rounded-full animate-float-3" />
        <div className="absolute top-32 left-[35%] w-0.5 h-0.5 bg-white/30 rounded-full animate-float-4" />
        <div className="absolute top-80 left-[10%] w-1 h-1 bg-emerald-400/30 rounded-full animate-float-2" />
        <div className="absolute top-48 left-[85%] w-0.5 h-0.5 bg-cyan-300/30 rounded-full animate-float-1" />
        <div className="absolute top-96 left-[45%] w-1 h-1 bg-white/20 rounded-full animate-float-3" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header Navigation */}
        <header className={`pt-3 px-4 sm:px-6 lg:px-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            {/* Zona Play Link */}
            <Link
              href="/play"
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
            >
              <div className="p-1 rounded bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                <Play className="w-3 h-3 text-purple-400" />
              </div>
              <span className="text-xs font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
                Zona Play
              </span>
            </Link>

            {/* Admin Login */}
            <Link
              href="/login"
              className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 hover:border-emerald-500/40 overflow-hidden transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <LogIn className="relative w-3.5 h-3.5 text-emerald-400" />
              <span className="relative text-xs font-medium text-emerald-300 group-hover:text-emerald-200 transition-colors hidden sm:inline">
                Administradores
              </span>
            </Link>
          </div>
        </header>

        {/* Hero Section - Compact */}
        <section className="pt-4 md:pt-6 pb-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            {/* Logo with glow - Smaller */}
            <div className={`relative inline-block mb-3 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse-slow scale-150" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 mx-auto">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-[2px] shadow-xl shadow-emerald-500/30 animate-spin-slow" style={{ animationDuration: '20s' }}>
                  <div className="w-full h-full rounded-full bg-[#030712]" />
                </div>
                <div className="absolute inset-[2px] rounded-full bg-[#030712] flex items-center justify-center">
                  <img
                    src="/zona-gol.png"
                    alt="Zona Gol"
                    className="w-14 h-14 md:w-18 md:h-18 object-contain drop-shadow-xl"
                  />
                </div>
              </div>
            </div>

            {/* Title - Smaller */}
            <div className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1
                className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-1"
                style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
              >
                <span className="bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
                  ZONA
                </span>
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 bg-clip-text text-transparent">
                  -
                </span>
                <span className="bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
                  GOL
                </span>
              </h1>

              <p className="text-gray-500 text-xs tracking-[0.2em] uppercase mb-3">
                Gestión de Ligas de Fútbol
              </p>
            </div>

            {/* Decorative divider - Smaller */}
            <div className={`flex items-center justify-center gap-3 mb-4 transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <div className="h-px w-12 md:w-16 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-sm animate-pulse" />
                <Trophy className="relative w-4 h-4 text-emerald-400" />
              </div>
              <div className="h-px w-12 md:w-16 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            </div>
          </div>
        </section>

        {/* Leagues Section */}
        <section className="flex-1 pb-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className={`text-center mb-4 transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h2 className="text-lg md:text-xl font-bold text-white mb-0.5">
                Ligas Disponibles
              </h2>
              <p className="text-gray-500 text-xs">
                Explora las competiciones activas
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse scale-150" />
                  <Loader2 className="relative w-8 h-8 animate-spin text-emerald-500" />
                </div>
                <p className="mt-3 text-gray-500 text-xs tracking-wide">Cargando ligas...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="max-w-md mx-auto rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && activeLeagues.length === 0 && (
              <div className={`text-center py-8 transition-all duration-700 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gray-500/10 rounded-full blur-lg" />
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-white/5 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  No hay ligas disponibles
                </h3>
                <p className="text-gray-500 text-xs mb-4 max-w-xs mx-auto">
                  Las ligas aparecerán aquí cuando estén disponibles
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-300"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Acceder al Panel</span>
                </Link>
              </div>
            )}

            {/* League Cards Carousel */}
            {activeLeagues.length > 0 && (
              <div className={`relative px-2 md:px-12 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
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
                              isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-40'
                            }`}
                          >
                            {/* Card glow */}
                            <div className={`absolute -inset-px bg-gradient-to-b from-emerald-500/30 via-transparent to-transparent rounded-2xl blur-sm transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

                            {/* Card */}
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 backdrop-blur-xl">
                              {/* Corner accents */}
                              <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-emerald-500/30 rounded-tl-2xl" />
                              <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-emerald-500/30 rounded-br-2xl" />

                              {/* Decorative gradient */}
                              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-emerald-500/10 to-transparent" />

                              <div className="relative p-4 md:p-5">
                                <div className="flex flex-col md:flex-row items-center gap-4">
                                  {/* League logo */}
                                  <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-lg animate-pulse-slow" />
                                    <Avatar className="relative w-16 h-16 md:w-20 md:h-20 border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/20">
                                      {league.logo && (
                                        <AvatarImage src={league.logo} alt={league.name} className="object-cover" />
                                      )}
                                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-lg md:text-xl font-black">
                                        {getLeagueInitials(league.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>

                                  {/* League info */}
                                  <div className="flex-1 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
                                      <h3 className="text-base md:text-lg font-bold text-white">
                                        {league.name}
                                      </h3>
                                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-2 py-0">
                                        Activa
                                      </Badge>
                                    </div>

                                    {league.description && (
                                      <p className="text-gray-400 text-xs mb-3 line-clamp-1">
                                        {league.description}
                                      </p>
                                    )}

                                    {/* Stats */}
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-500/20">
                                          <Users className="w-3 h-3 text-blue-400" />
                                        </div>
                                        <div>
                                          <p className="text-base font-bold text-white leading-none">{stats.teamsCount}</p>
                                          <p className="text-[10px] text-gray-500">Equipos</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/20">
                                          <Trophy className="w-3 h-3 text-purple-400" />
                                        </div>
                                        <div>
                                          <p className="text-base font-bold text-white leading-none">{stats.tournamentsCount}</p>
                                          <p className="text-[10px] text-gray-500">Torneos</p>
                                        </div>
                                      </div>
                                      {stats.activeTournament && (
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/20">
                                            <Calendar className="w-3 h-3 text-emerald-400" />
                                          </div>
                                          <div>
                                            <p className="text-xs font-medium text-white leading-none">{stats.activeTournament.name}</p>
                                            <p className="text-[10px] text-gray-500">En curso</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* CTA Button */}
                                    <Button
                                      onClick={() => {
                                        setNavigating(league.id)
                                        router.push(`/liga/${league.slug}`)
                                      }}
                                      disabled={navigating !== null}
                                      className="group relative w-full md:w-auto h-9 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:via-emerald-300 hover:to-emerald-400 text-white font-semibold px-5 rounded-lg border-0 overflow-hidden shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                      {navigating === league.id ? (
                                        <>
                                          <Loader2 className="relative w-4 h-4 mr-2 animate-spin" />
                                          <span className="relative text-sm">Cargando...</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="relative text-sm">Ver Liga</span>
                                          <ArrowRight className="relative w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CarouselItem>
                      )
                    })}
                  </CarouselContent>

                  {/* Carousel controls */}
                  {activeLeagues.length > 1 && (
                    <>
                      <CarouselPrevious className="absolute left-0 md:-left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-emerald-400 hover:border-emerald-500/30 backdrop-blur-sm rounded-lg transition-all duration-300">
                        <ChevronLeft className="w-4 h-4" />
                      </CarouselPrevious>
                      <CarouselNext className="absolute right-0 md:-right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-emerald-400 hover:border-emerald-500/30 backdrop-blur-sm rounded-lg transition-all duration-300">
                        <ChevronRight className="w-4 h-4" />
                      </CarouselNext>
                    </>
                  )}
                </Carousel>

                {/* Pagination dots */}
                {activeLeagues.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-4">
                    {activeLeagues.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => api?.scrollTo(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          index === current
                            ? 'w-6 bg-emerald-500 shadow-md shadow-emerald-500/50'
                            : 'w-1.5 bg-white/20 hover:bg-white/30'
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
        <footer className={`py-3 transition-all duration-700 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-center">
            <p className="text-gray-700 text-[10px] tracking-wider">
              © {new Date().getFullYear()} Zona Gol
            </p>
          </div>
        </footer>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.3; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-5px); }
          75% { transform: translateY(-30px) translateX(5px); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-15px) translateX(-10px); }
          66% { transform: translateY(-25px) translateX(10px); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-4 {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.5); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-pulse-slower {
          animation: pulse-slower 6s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        .animate-float-1 {
          animation: float-1 8s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-2 10s ease-in-out infinite;
        }
        .animate-float-3 {
          animation: float-3 6s ease-in-out infinite;
        }
        .animate-float-4 {
          animation: float-4 7s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
