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
      return <Badge variant="secondary">Finalizado</Badge>
    } else if (now >= startDate && (!endDate || now <= endDate)) {
      return <Badge className="bg-green-600">En Curso</Badge>
    } else {
      return <Badge variant="outline">Próximamente</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Cargando torneos...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-red-600">{error}</p>
          <Button onClick={() => router.back()} variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header with League Info */}
      <div className="flex items-center space-x-4">
        <Button onClick={() => router.back()} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            {league.logo ? (
              <AvatarImage src={league.logo} alt={`${league.name} logo`} />
            ) : (
              <AvatarFallback className="bg-blue-100 text-blue-800 font-bold text-lg">
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
            <h1 className="text-3xl font-bold text-gray-900">{league.name}</h1>
            <p className="text-gray-600">/{league.slug}</p>
          </div>
        </div>
      </div>

      {/* League Description */}
      {league.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-700">{league.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tournaments List */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Torneos</h2>

        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay torneos disponibles
              </h3>
              <p className="text-gray-600">
                Los torneos aparecerán aquí cuando se creen
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{tournament.name}</CardTitle>
                      <CardDescription>
                        {new Date(tournament.start_date).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </CardDescription>
                    </div>
                    {getStatusBadge(tournament)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tournament.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {tournament.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      {tournament.teamsCount} equipos
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Trophy className="w-4 h-4 mr-2" />
                      {tournament.matchesCount} partidos
                    </div>
                    {tournament.format && (
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        Formato: {tournament.format}
                      </div>
                    )}
                  </div>

                  <Link href={`/liga/${league.slug}/torneo/${tournament.id}`}>
                    <Button className="w-full">
                      Ver Torneo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
