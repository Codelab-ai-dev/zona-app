import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, AlertTriangle, Trophy, Users, Calendar, Loader2 } from 'lucide-react'

import { useRefereeReport, useMatch } from '../api'

interface RefereeReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  matchId: string
}

export function RefereeReportModal({ open, onOpenChange, matchId }: RefereeReportModalProps) {
  const match = useMatch(open ? matchId : undefined)
  const report = useRefereeReport(open ? matchId : undefined)

  const formatMatchDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isLoading = match.isLoading || report.isLoading
  const isError = match.isError || report.isError
  const matchData = match.data
  const reportData = report.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Cédula Arbitral
          </DialogTitle>
          {matchData && (
            <DialogDescription>
              {matchData.home_team?.name} vs {matchData.away_team?.name} - {formatMatchDate(matchData.match_date)}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span>Cargando cédula arbitral...</span>
          </div>
        ) : isError ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Error al cargar</h3>
              <p className="text-red-800">
                {match.error?.message || report.error?.message || 'Error desconocido'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Match Header */}
            {matchData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <span className="flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Resultado Final
                    </span>
                    <Badge variant={matchData.status === 'finished' ? 'default' : 'secondary'}>
                      {matchData.status === 'finished' ? 'Finalizado' : 'En progreso'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <span className="text-lg font-semibold">{matchData.home_team?.name}</span>
                      <span className="text-3xl font-bold">
                        {matchData.home_score} - {matchData.away_score}
                      </span>
                      <span className="text-lg font-semibold">{matchData.away_team?.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {formatMatchDate(matchData.match_date)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Referee Information */}
            {reportData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Información del Árbitro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reportData.referee_name && (
                    <div>
                      <span className="font-medium">Árbitro Principal: </span>
                      {reportData.referee_name}
                    </div>
                  )}
                  {reportData.assistant_referee_1 && (
                    <div>
                      <span className="font-medium">Asistente 1: </span>
                      {reportData.assistant_referee_1}
                    </div>
                  )}
                  {reportData.assistant_referee_2 && (
                    <div>
                      <span className="font-medium">Asistente 2: </span>
                      {reportData.assistant_referee_2}
                    </div>
                  )}
                  {reportData.fourth_official && (
                    <div>
                      <span className="font-medium">Cuarto Árbitro: </span>
                      {reportData.fourth_official}
                    </div>
                  )}

                  {reportData.general_observations && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <div className="font-medium mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Observaciones Generales:
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{reportData.general_observations}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-amber-600 mb-4" />
                  <h3 className="text-lg font-medium text-amber-900 mb-2">No hay cédula arbitral disponible</h3>
                  <p className="text-amber-800">Este partido no tiene información de cédula arbitral registrada.</p>
                </CardContent>
              </Card>
            )}

            {/* Match Conditions */}
            {reportData && (reportData.weather_conditions || reportData.field_conditions) && (
              <Card>
                <CardHeader>
                  <CardTitle>Condiciones del Partido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reportData.weather_conditions && (
                    <div>
                      <span className="font-medium">Clima: </span>
                      {reportData.weather_conditions}
                    </div>
                  )}
                  {reportData.field_conditions && (
                    <div>
                      <span className="font-medium">Campo: </span>
                      {reportData.field_conditions}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
