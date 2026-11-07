import React, { useState } from 'react'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, QueryState } from '@/components/states'
import { useMyLeagues } from '@/features/leagues/api'
import { useTeamsByLeague, useQRBatchUpdate } from './api'
import { api } from '@/lib/api/client'
import { toast } from 'sonner'

interface BatchResult {
  success: number
  failed: number
  errors: Array<{ teamName: string; error: string }>
}

export function QRBatchPage() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<BatchResult | null>(null)
  const hasSelectedRef = React.useRef(false)

  const leaguesQuery = useMyLeagues()
  const teamsQuery = useTeamsByLeague(selectedLeagueId)
  const qrBatchMutation = useQRBatchUpdate()

  // Auto-select first league
  React.useEffect(() => {
    const firstLeague = leaguesQuery.data?.data?.[0]
    if (!selectedLeagueId && firstLeague && !hasSelectedRef.current) {
      hasSelectedRef.current = true
      setSelectedLeagueId(firstLeague.id)
    }
  }, [selectedLeagueId, leaguesQuery.data])

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    )
  }

  const handleSelectAll = () => {
    if (!teamsQuery.data?.data) return
    const allIds = teamsQuery.data.data.map(t => t.id)
    setSelectedTeamIds(allIds)
  }

  const handleClearAll = () => {
    setSelectedTeamIds([])
  }

  const handleBatchUpdate = async () => {
    if (!selectedLeagueId || selectedTeamIds.length === 0) {
      toast.error('Selecciona una liga y al menos un equipo')
      return
    }

    try {
      setIsProcessing(true)
      setProgress(0)
      setResult(null)

      // Fetch players for selected teams
      const teamPlayers: Array<{ teamName: string; players: Array<{ id: string }> }> = []

      for (let i = 0; i < selectedTeamIds.length; i++) {
        const teamId = selectedTeamIds[i]
        const team = teamsQuery.data?.data?.find(t => t.id === teamId)

        try {
          const playersRes = await api.list(
            `/teams/${teamId}/players`,
            { limit: 1000 }
          )

          const players = (playersRes.data as Array<{ id: string }>).map(p => ({ id: p.id }))
          teamPlayers.push({
            teamName: team?.name || 'Equipo desconocido',
            players,
          })

          setProgress(((i + 1) / selectedTeamIds.length) * 50)
        } catch {
          teamPlayers.push({
            teamName: team?.name || 'Equipo desconocido',
            players: [],
          })
        }
      }

      // Flatten all players
      const allPlayers = teamPlayers.flatMap(tp => tp.players)

      if (allPlayers.length === 0) {
        toast.warning('No hay jugadores para actualizar')
        setIsProcessing(false)
        return
      }

      // Send batch update
      await qrBatchMutation.mutateAsync({
        leagueId: selectedLeagueId,
        batch: { players: allPlayers },
      })

      setProgress(100)
      setResult({
        success: allPlayers.length,
        failed: 0,
        errors: [],
      })
      toast.success(`${allPlayers.length} códigos QR actualizados exitosamente`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error en la actualización'
      toast.error(`Error: ${errorMsg}`)
      setResult({
        success: 0,
        failed: selectedTeamIds.length,
        errors: selectedTeamIds.map(id => ({
          teamName: teamsQuery.data?.data?.find(t => t.id === id)?.name || 'Desconocido',
          error: errorMsg,
        })),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Actualización Masiva de QR</h1>
        <p className="text-muted-foreground mt-1">Regenera códigos QR para todos los jugadores de equipos seleccionados</p>
      </div>

      <QueryState
        query={leaguesQuery}
        isEmpty={(data) => data.data.length === 0}
        loadingLabel="Cargando ligas…"
        empty={<EmptyState title="No hay ligas" description="No administras ninguna liga" />}
        children={(leaguesRes) => (
          <div className="space-y-6">
            {leaguesRes.data.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="league-select">Selecciona una liga</Label>
                <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                  <SelectTrigger id="league-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaguesRes.data.map((league) => (
                      <SelectItem key={league.id} value={league.id}>
                        {league.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <QueryState
              query={teamsQuery}
              isEmpty={(data) => data.data.length === 0}
              loadingLabel="Cargando equipos…"
              empty={<EmptyState title="No hay equipos" description="Crea equipos primero en la sección de Equipos" />}
              children={(teamsRes) => (
                <div className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Selecciona los equipos cuyos jugadores necesitan actualizar sus códigos QR.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleSelectAll} size="sm">
                        Seleccionar todos
                      </Button>
                      <Button variant="outline" onClick={handleClearAll} size="sm">
                        Deseleccionar todos
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {teamsRes.data.map(team => (
                        <label key={team.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" aria-label={`Seleccionar ${team.name}`}>
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.includes(team.id)}
                            onChange={() => handleToggleTeam(team.id)}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{team.name}</p>
                            <p className="text-sm text-muted-foreground">{team.slug}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleBatchUpdate}
                    disabled={isProcessing || selectedTeamIds.length === 0}
                    className="w-full gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Procesando... {Math.round(progress)}%
                      </>
                    ) : (
                      `Actualizar QR (${selectedTeamIds.length} equipos)`
                    )}
                  </Button>

                  {isProcessing && (
                    <div className="space-y-2">
                      <Progress value={progress} className="h-2" />
                      <p className="text-sm text-muted-foreground text-center">
                        Generando códigos QR para los jugadores...
                      </p>
                    </div>
                  )}

                  {result && (
                    <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
                      {result.failed === 0 ? (
                        <div className="flex gap-2 items-start">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Actualización completada exitosamente</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Se actualizaron {result.success} códigos QR
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2 items-start">
                            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">Actualización parcial</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {result.success} exitosos, {result.failed} fallaron
                              </p>
                            </div>
                          </div>
                          {result.errors.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-medium">Errores:</p>
                              {result.errors.map((error, idx) => (
                                <div key={idx} className="text-sm text-destructive">
                                  {error.teamName}: {error.error}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            />
          </div>
        )}
      />
    </div>
  )
}
