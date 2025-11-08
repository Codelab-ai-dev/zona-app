"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Calendar, Users, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"
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

        // Cargar torneos de la liga
        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('league_id', league.id)
          .order('start_date', { ascending: false })

        if (tournamentsError) {
          throw tournamentsError
        }

        // Cargar estadísticas para cada torneo
        const tournamentsWithStats = await Promise.all(
          (tournamentsData || []).map(async (tournament) => {
            // Contar equipos
            const { count: teamsCount } = await supabase
              .from('teams')
              .select('*', { count: 'exact', head: true })
              .eq('tournament_id', tournament.id)

            // Contar partidos
            const { count: matchesCount } = await supabase
              .from('matches')
              .select('*', { count: 'exact', head: true })
              .eq('tournament_id', tournament.id)

            return {
              ...tournament,
              teamsCount: teamsCount || 0,
              matchesCount: matchesCount || 0
            }
          })
        )

        setTournaments(tournamentsWithStats)
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
      return <Badge className="backdrop-blur-md bg-gray-500/80 text-white border-0">Finalizado</Badge>
    } else if (now >= startDate && (!endDate || now <= endDate)) {
      return <Badge className="backdrop-blur-md bg-green-500/80 text-white border-0">En Curso</Badge>
    } else {
      return <Badge className="backdrop-blur-md bg-blue-500/80 text-white border-0">Próximamente</Badge>
    }
  }

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-xl">
            <Loader2 className="w-8 h-8 animate-spin mr-2 text-white" />
            <span className="text-white drop-shadow">Cargando torneos...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="text-center py-12 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">Error</h2>
            <p className="text-red-300 drop-shadow">{error}</p>
            <Button onClick={() => router.back()} className="mt-4 backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="relative z-10 container mx-auto px-4 py-8 space-y-6">
        {/* Header with League Info */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20 shadow-xl">
          <div className="flex items-center space-x-4">
            <Button onClick={() => router.back()} size="sm" className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16 border-2 border-white/30 shadow-lg">
                {league.logo ? (
                  <AvatarImage src={league.logo} alt={`${league.name} logo`} />
                ) : (
                  <AvatarFallback className="backdrop-blur-md bg-white/20 text-white font-bold text-lg">
                    {league.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">{league.name}</h1>
                <p className="text-white/70 drop-shadow">/{league.slug}</p>
              </div>
            </div>
          </div>
        </div>

        {/* League Description */}
        {league.description && (
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20 shadow-xl">
            <p className="text-white/90 drop-shadow">{league.description}</p>
          </div>
        )}

        {/* Tournaments List */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">Torneos</h2>

          {tournaments.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-xl">
              <div className="py-12 text-center">
                <Trophy className="w-12 h-12 text-white/70 mx-auto mb-4 drop-shadow-lg" />
                <h3 className="text-lg font-medium text-white mb-2 drop-shadow">
                  No hay torneos disponibles
                </h3>
                <p className="text-white/80 drop-shadow">
                  Los torneos aparecerán aquí cuando se creen
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 transform">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white drop-shadow-lg">{tournament.name}</h3>
                        <p className="text-white/70 text-sm drop-shadow">
                          {new Date(tournament.start_date).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      {getStatusBadge(tournament)}
                    </div>
                    <div className="space-y-4">
                      {tournament.description && (
                        <p className="text-sm text-white/80 line-clamp-2 drop-shadow">
                          {tournament.description}
                        </p>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-white/80 drop-shadow">
                          <Users className="w-4 h-4 mr-2" />
                          {tournament.teamsCount} equipos
                        </div>
                        <div className="flex items-center text-white/80 drop-shadow">
                          <Trophy className="w-4 h-4 mr-2" />
                          {tournament.matchesCount} partidos
                        </div>
                        {tournament.format && (
                          <div className="flex items-center text-white/80 drop-shadow">
                            <Calendar className="w-4 h-4 mr-2" />
                            Formato: {tournament.format}
                          </div>
                        )}
                      </div>

                      <Link href={`/liga/${league.slug}/torneo/${tournament.id}`}>
                        <Button className="w-full backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg">
                          Ver Torneo
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
