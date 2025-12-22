"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Calendar, Users, ArrowRight, ArrowLeft, Loader2, Home } from "lucide-react"
import { Database } from "@/lib/supabase/database.types"
import { createClientSupabaseClient } from "@/lib/supabase/client"

type League = Database['public']['Tables']['leagues']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']

interface LeagueTournamentsViewProps {
  league: League
}

interface TournamentWithStats extends Tournament {
  teamsCount: number
  matchesCount: number
}

export function LeagueTournamentsView({ league }: LeagueTournamentsViewProps) {
  const router = useRouter()
  const supabase = createClientSupabaseClient()
  const [tournaments, setTournaments] = useState<TournamentWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        setLoading(true)
        setError(null)

        // Cargar torneos
        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('league_id', league.id)
          .order('start_date', { ascending: false })

        if (tournamentsError) {
          throw tournamentsError
        }

        if (!tournamentsData || tournamentsData.length === 0) {
          setTournaments([])
          return
        }

        const tournamentIds = tournamentsData.map(t => t.id)

        // OPTIMIZACIÓN: Cargar todos los counts en paralelo con una sola query por tabla
        const [teamsResult, matchesResult] = await Promise.all([
          supabase
            .from('teams')
            .select('id', { count: 'exact', head: true })
            .eq('league_id', league.id)
            .eq('is_active', true),

          supabase
            .from('matches')
            .select('tournament_id')
            .in('tournament_id', tournamentIds)
        ])

        const totalTeamsCount = teamsResult.count || 0

        // Agrupar partidos por torneo
        const matchesByTournament: Record<string, number> = {}
        tournamentIds.forEach(id => { matchesByTournament[id] = 0 })

        matchesResult.data?.forEach((match: any) => {
          if (match.tournament_id) {
            matchesByTournament[match.tournament_id] = (matchesByTournament[match.tournament_id] || 0) + 1
          }
        })

        const tournamentsWithStats = tournamentsData.map((tournament) => ({
          ...tournament,
          teamsCount: totalTeamsCount,
          matchesCount: matchesByTournament[tournament.id] || 0
        }))

        setTournaments(tournamentsWithStats as TournamentWithStats[])
      } catch (err: any) {
        console.error('Error loading tournaments:', err)
        setError(err.message || 'Error cargando torneos')
      } finally {
        setLoading(false)
      }
    }

    loadTournaments()
  }, [league.id, supabase])

  const getStatusBadge = (tournament: Tournament) => {
    const now = new Date()
    const startDate = new Date(tournament.start_date)
    const endDate = tournament.end_date ? new Date(tournament.end_date) : null

    if (endDate && now > endDate) {
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">Finalizado</Badge>
    } else if (now >= startDate && (!endDate || now <= endDate)) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">En Curso</Badge>
    } else {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Próximamente</Badge>
    }
  }

  const getLeagueInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-1/3 h-screen bg-gradient-to-bl from-green-500/10 via-transparent to-transparent transform skew-x-12" />
          <div className="absolute bottom-0 left-0 w-1/4 h-screen bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent transform -skew-x-12" />
          <div className="absolute top-10 right-10 w-48 h-48 bg-green-500/5 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="relative w-10 h-10 animate-spin text-green-500" />
          </div>
          <p className="mt-4 text-gray-400">Cargando torneos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-1/3 h-screen bg-gradient-to-bl from-red-500/10 via-transparent to-transparent transform skew-x-12" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
            <h2 className="text-xl font-bold text-white mb-3">Error</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Fondo con elementos deportivos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-0 right-0 w-1/3 h-screen bg-gradient-to-bl from-green-500/10 via-transparent to-transparent transform skew-x-12" />
          <div className="absolute bottom-0 left-0 w-1/4 h-screen bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent transform -skew-x-12" />
        </div>
        <div className="absolute top-10 right-10 w-48 h-48 bg-green-500/5 rounded-full blur-2xl" />
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="pt-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <Home className="w-4 h-4 mr-2" />
              Inicio
            </Button>
          </div>
        </header>

        {/* Hero Section - Liga Info */}
        <section className="pt-6 pb-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl">
              {/* Decoración angular */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-500/20 to-transparent transform rotate-12 translate-x-8 -translate-y-8" />

              <div className="relative p-6 md:p-8">
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
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                      {league.name}
                    </h1>
                    {league.description && (
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {league.description}
                      </p>
                    )}
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2 py-0.5">
                        Liga Activa
                      </Badge>
                      <span className="text-gray-500 text-xs">/{league.slug}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decoración angular inferior */}
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/10 to-transparent transform -rotate-12 -translate-x-6 translate-y-6" />
            </div>
          </div>
        </section>

        {/* Sección de Torneos */}
        <section className="flex-1 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Título de sección */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-green-500" />
                <h2 className="text-xl md:text-2xl font-bold text-white">
                  Torneos
                </h2>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-green-500/50 to-transparent" />
            </div>

            {tournaments.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-slate-800/50 border border-white/10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
                  <Trophy className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  No hay torneos disponibles
                </h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto">
                  Los torneos aparecerán aquí cuando se creen
                </p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 hover:border-green-500/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-500/10"
                  >
                    {/* Decoración */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-white group-hover:text-green-400 transition-colors">
                            {tournament.name}
                          </h3>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {new Date(tournament.start_date).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        {getStatusBadge(tournament)}
                      </div>

                      {tournament.description && (
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                          {tournament.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 rounded bg-blue-500/20">
                            <Users className="w-3 h-3 text-blue-400" />
                          </div>
                          <span className="text-sm text-gray-400">{tournament.teamsCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 rounded bg-purple-500/20">
                            <Trophy className="w-3 h-3 text-purple-400" />
                          </div>
                          <span className="text-sm text-gray-400">{tournament.matchesCount}</span>
                        </div>
                        {tournament.format && (
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded bg-orange-500/20">
                              <Calendar className="w-3 h-3 text-orange-400" />
                            </div>
                            <span className="text-sm text-gray-400 capitalize">{tournament.format}</span>
                          </div>
                        )}
                      </div>

                      {/* Botón */}
                      <Link href={`/liga/${league.slug}/torneo/${tournament.id}`}>
                        <Button
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-md shadow-green-500/25 transition-all duration-300"
                          size="sm"
                        >
                          Ver Torneo
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
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
