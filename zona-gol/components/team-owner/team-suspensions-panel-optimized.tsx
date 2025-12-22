"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Ban, AlertTriangle } from "lucide-react"
import { useTeamSuspensions } from "@/lib/queries"

interface TeamSuspensionsPanelOptimizedProps {
  teamId: string
}

function SuspensionsSkeleton() {
  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
          <Ban className="w-5 h-5" />
          Jugadores Suspendidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 bg-white/10 rounded-xl" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function TeamSuspensionsPanelOptimized({ teamId }: TeamSuspensionsPanelOptimizedProps) {
  const { data: suspensions = [], isLoading } = useTeamSuspensions(teamId)

  const getSuspensionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      red_card: 'Tarjeta Roja',
      yellow_accumulation: 'Acum. Amarillas',
      disciplinary_committee: 'Comité Disciplinario',
      other: 'Otro',
    }
    return labels[type] || type
  }

  if (isLoading) {
    return <SuspensionsSkeleton />
  }

  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
          <Ban className="w-5 h-5" />
          Jugadores Suspendidos
        </CardTitle>
        <CardDescription className="text-white/70 drop-shadow">
          {suspensions.length > 0
            ? `${suspensions.length} jugador${suspensions.length > 1 ? 'es' : ''} con suspensión activa`
            : 'No hay suspensiones activas'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {suspensions.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full backdrop-blur-md bg-green-500/20 border border-green-300/30 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-sm text-white/80 drop-shadow">
              Todos los jugadores están habilitados para jugar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suspensions.map((suspension) => {
              const matchesRemaining = suspension.matches_to_serve - suspension.matches_served
              return (
                <div
                  key={suspension.id}
                  className="p-4 backdrop-blur-md bg-red-500/20 border border-red-300/30 rounded-xl shadow-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white drop-shadow">
                        {suspension.player_name}
                      </span>
                      <Badge variant="outline" className="border-white/30 text-white">#{suspension.jersey_number}</Badge>
                      <Badge variant="destructive" className="text-xs bg-red-600/80 border-0">
                        SUSPENDIDO
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      <span className="text-white/80 drop-shadow">Tipo:</span>
                      <Badge variant="secondary" className="text-xs backdrop-blur-md bg-white/20 border-white/30 text-white">
                        {getSuspensionTypeLabel(suspension.suspension_type)}
                      </Badge>
                    </div>

                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      <span className="text-white/80 drop-shadow">Partidos pendientes:</span>
                      <span className="font-bold text-red-300 drop-shadow">
                        {matchesRemaining} de {suspension.matches_to_serve}
                      </span>
                    </div>

                    {suspension.reason && (
                      <div className="pt-2 border-t border-red-300/30">
                        <p className="text-xs text-white/80 drop-shadow">
                          <span className="font-medium">Motivo:</span> {suspension.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
