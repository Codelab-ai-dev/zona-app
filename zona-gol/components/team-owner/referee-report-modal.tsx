"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { FileText, Clock, AlertTriangle, Trophy, Users, Calendar, Loader2 } from "lucide-react"

type Match = Database['public']['Tables']['matches']['Row']
type RefereeReport = Database['public']['Tables']['match_referee_reports']['Row']
type MatchGoal = Database['public']['Tables']['match_goals']['Row']
type MatchCard = Database['public']['Tables']['match_cards']['Row']
type MatchIncident = Database['public']['Tables']['match_incidents']['Row']

interface RefereeReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  match: Match & {
    home_team?: { name: string; logo?: string }
    away_team?: { name: string; logo?: string }
  }
}

export function RefereeReportModal({ open, onOpenChange, match }: RefereeReportModalProps) {
  const [refereeReport, setRefereeReport] = useState<RefereeReport | null>(null)
  const [goals, setGoals] = useState<(MatchGoal & { player?: { name: string; jersey_number: number }; team?: { name: string } })[]>([])
  const [cards, setCards] = useState<(MatchCard & { player?: { name: string; jersey_number: number }; team?: { name: string } })[]>([])
  const [incidents, setIncidents] = useState<MatchIncident[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (open && match.id) {
      loadRefereeReportData()
    }
  }, [open, match.id])

  const loadRefereeReportData = async () => {
    setLoading(true)
    try {
      // Load referee report
      const { data: reportData } = await supabase
        .from('match_referee_reports')
        .select('*')
        .eq('match_id', match.id)
        .single()

      setRefereeReport(reportData)

      // Load goals with player and team info
      const { data: goalsData } = await supabase
        .from('match_goals')
        .select(`
          *,
          player:players(name, jersey_number),
          team:teams(name)
        `)
        .eq('match_id', match.id)
        .order('minute')

      setGoals(goalsData || [])

      // Load cards with player and team info
      const { data: cardsData } = await supabase
        .from('match_cards')
        .select(`
          *,
          player:players(name, jersey_number),
          team:teams(name)
        `)
        .eq('match_id', match.id)
        .order('minute')

      setCards(cardsData || [])

      // Load incidents
      const { data: incidentsData } = await supabase
        .from('match_incidents')
        .select('*')
        .eq('match_id', match.id)
        .order('minute')

      setIncidents(incidentsData || [])

    } catch (error) {
      console.error('Error loading referee report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMatchDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 border-white/20 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <FileText className="w-5 h-5" />
            Cédula Arbitral
          </DialogTitle>
          <DialogDescription className="text-white/80 drop-shadow">
            {match.home_team?.name} vs {match.away_team?.name} - {formatMatchDate(match.match_date)}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3 text-white" />
            <span className="text-white drop-shadow">Cargando cédula arbitral...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Match Header */}
            <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white drop-shadow-lg">
                  <span className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Resultado Final
                  </span>
                  <Badge variant={match.status === 'finished' ? 'default' : 'secondary'}>
                    {match.status === 'finished' ? 'Finalizado' : 'En progreso'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-lg font-semibold text-white drop-shadow">{match.home_team?.name}</span>
                    <span className="text-3xl font-bold text-white drop-shadow-lg">{match.home_score} - {match.away_score}</span>
                    <span className="text-lg font-semibold text-white drop-shadow">{match.away_team?.name}</span>
                  </div>
                  <div className="text-sm text-white/70 drop-shadow">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {formatMatchDate(match.match_date)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referee Information */}
            {refereeReport && (
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                    <Users className="w-5 h-5" />
                    Información del Árbitro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {refereeReport.referee_name && (
                    <div>
                      <span className="font-medium text-white drop-shadow">Árbitro Principal: </span>
                      {refereeReport.referee_name}
                    </div>
                  )}
                  {refereeReport.assistant_referee_1 && (
                    <div>
                      <span className="font-medium text-white drop-shadow">Asistente 1: </span>
                      {refereeReport.assistant_referee_1}
                    </div>
                  )}
                  {refereeReport.assistant_referee_2 && (
                    <div>
                      <span className="font-medium text-white drop-shadow">Asistente 2: </span>
                      {refereeReport.assistant_referee_2}
                    </div>
                  )}
                  {refereeReport.fourth_official && (
                    <div>
                      <span className="font-medium text-white drop-shadow">Cuarto Árbitro: </span>
                      {refereeReport.fourth_official}
                    </div>
                  )}

                  {refereeReport.general_observations && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <div className="font-medium mb-2 flex items-center gap-2 text-white drop-shadow">
                          <FileText className="w-4 h-4" />
                          Observaciones Generales:
                        </div>
                        <div className="p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20">
                          <p className="text-white/90 drop-shadow whitespace-pre-wrap">
                            {refereeReport.general_observations}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Goals */}
            {goals.length > 0 && (
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                    <Trophy className="w-5 h-5" />
                    Goles ({goals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {goals.map((goal) => (
                      <div key={goal.id} className="flex items-center justify-between p-3 backdrop-blur-md bg-green-500/20 rounded-xl border border-green-300/30">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-green-100 border-green-300">
                            {goal.minute}'
                          </Badge>
                          <div>
                            <div className="font-medium text-white drop-shadow">
                              {goal.player?.name} (#{goal.player?.jersey_number})
                            </div>
                            <div className="text-sm text-white/70 drop-shadow">
                              {goal.team?.name} - {goal.goal_type}
                            </div>
                            {goal.description && (
                              <div className="text-sm text-white/80 drop-shadow mt-1">{goal.description}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cards */}
            {cards.length > 0 && (
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                    <AlertTriangle className="w-5 h-5" />
                    Tarjetas ({cards.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cards.map((card) => (
                      <div key={card.id} className={`flex items-center justify-between p-3 rounded-xl backdrop-blur-md border ${card.card_type === 'yellow' ? 'bg-yellow-500/20 border-yellow-300/30' : 'bg-red-500/20 border-red-300/30'}`}>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline"
                                 className={card.card_type === 'yellow' ? 'backdrop-blur-md bg-yellow-500/30 border-yellow-300/50 text-white' : 'backdrop-blur-md bg-red-500/30 border-red-300/50 text-white'}>
                            {card.minute}'
                          </Badge>
                          <div>
                            <div className="font-medium text-white drop-shadow">
                              {card.player?.name} (#{card.player?.jersey_number})
                            </div>
                            <div className="text-sm text-white/70 drop-shadow">
                              {card.team?.name} - Tarjeta {card.card_type === 'yellow' ? 'Amarilla' : 'Roja'}
                            </div>
                            {card.reason && (
                              <div className="text-sm text-white/80 drop-shadow mt-1">{card.reason}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Incidents */}
            {incidents.length > 0 && (
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                    <Clock className="w-5 h-5" />
                    Incidencias ({incidents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {incidents.map((incident) => (
                      <div key={incident.id} className="p-3 backdrop-blur-md bg-blue-500/20 rounded-xl border border-blue-300/30">
                        <div className="flex items-start gap-2">
                          {incident.minute && (
                            <Badge variant="outline" className="bg-blue-100 border-blue-300">
                              {incident.minute}'
                            </Badge>
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-white drop-shadow">{incident.incident_type}</div>
                            <div className="text-sm text-white/80 drop-shadow mt-1">{incident.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Match Conditions */}
            {refereeReport && (refereeReport.weather_conditions || refereeReport.field_conditions) && (
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-lg">Condiciones del Partido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {refereeReport.weather_conditions && (
                    <div>
                      <span className="font-medium text-white drop-shadow">Clima: </span>
                      {refereeReport.weather_conditions}
                    </div>
                  )}
                  {refereeReport.field_conditions && (
                    <div>
                      <span className="font-medium text-white drop-shadow">Campo: </span>
                      {refereeReport.field_conditions}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* No data message */}
            {!refereeReport && goals.length === 0 && cards.length === 0 && incidents.length === 0 && (
              <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                <CardContent className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-white/60 mb-4" />
                  <h3 className="text-lg font-medium text-white drop-shadow mb-2">
                    No hay cédula arbitral disponible
                  </h3>
                  <p className="text-white/70 drop-shadow">
                    Este partido no tiene información de cédula arbitral registrada.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}