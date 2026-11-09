import { useState } from 'react'
import { AlertTriangle, Info, Loader2, QrCode, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState, QueryState } from '@/components/states'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

import { useQRBatchUpdate, useTeamsByLeague, type QRProgress, type QRRunResult } from './api'
import { LeaguePicker } from './components/league-picker'
import { QRInfo } from './components/qr-info'
import { QRResults } from './components/qr-results'
import { useSelectedLeague } from './use-selected-league'

const ghost = 'border-white/30 bg-white/10 text-white hover:bg-white/20'

export function QRBatchPage() {
  const { leaguesQuery, leagueId, setLeagueId } = useSelectedLeague()
  // `ids: null` means every team (the original always updated all players).
  const [selection, setSelection] = useState<{ leagueId: string; ids: string[] | null }>({ leagueId: '', ids: null })
  const [progress, setProgress] = useState<QRProgress>({ percent: 0, total: 0 })
  const [result, setResult] = useState<QRRunResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  const teamsQuery = useTeamsByLeague(leagueId)
  const qrMutation = useQRBatchUpdate()
  const processing = qrMutation.isPending

  const teams = teamsQuery.data?.data ?? []
  const picked = selection.leagueId === leagueId ? selection.ids : null
  const selectedIds = picked ?? teams.map((t) => t.id)
  const setIds = (ids: string[] | null) => setSelection({ leagueId, ids })
  const toggle = (id: string) => setIds(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])

  const run = async () => {
    const chosen = teams.filter((t) => selectedIds.includes(t.id)).map((t) => ({ id: t.id, name: t.name }))
    setProgress({ percent: 0, total: 0 })
    setResult(null)
    setRunError(null)
    try {
      const outcome = await qrMutation.mutateAsync({ leagueId, teams: chosen, onProgress: setProgress })
      setResult(outcome)
      const failed = outcome.failures.length
      if (outcome.updated === 0 && failed === 0) toast.info('No hay jugadores activos para actualizar')
      else if (failed === 0) toast.success(`¡Todos los ${outcome.updated} códigos QR fueron actualizados exitosamente!`)
      else toast.warning(`${outcome.updated} códigos QR actualizados, ${failed} fallaron`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      setRunError(message)
      toast.error(`Error: ${message}`)
    }
  }

  const allSelected = teams.length > 0 && selectedIds.length === teams.length
  const done = Math.round((progress.percent / 100) * progress.total)

  return (
    <div className="py-6">
      <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <QrCode className="h-5 w-5 text-blue-300" aria-hidden="true" />
            <h1>Actualización Masiva de Códigos QR</h1>
          </CardTitle>
          <CardDescription className="text-white/80 drop-shadow">
            Regenera los códigos QR de todos los jugadores activos para asegurar que funcionen correctamente con la app móvil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" aria-hidden="true" />
              <div>
                <h4 className="text-sm font-medium text-yellow-300">Importante</h4>
                <p className="mt-1 text-xs text-yellow-300/80">
                  Esta función regenerará los códigos QR de todos los jugadores activos de los equipos seleccionados. Los nuevos QR incluirán toda la información necesaria: ID del jugador, nombre, equipo, número de camiseta y liga. Esto corrige el problema de QR codes que no escaneaban correctamente en la app móvil.
                </p>
              </div>
            </div>
          </div>

          <QueryState
            query={leaguesQuery}
            isEmpty={(data) => data.data.length === 0}
            loadingLabel="Cargando ligas…"
            empty={<EmptyState title="No hay ligas" description="No administras ninguna liga" />}
          >
            {(leaguesRes) => {
              const league = leaguesRes.data.find((l) => l.id === leagueId)
              const supportsQR = league?.product_mode === 'full'
              return (
                <div className="space-y-6">
                  <LeaguePicker leagues={leaguesRes.data} value={leagueId} onChange={setLeagueId} />

                  {!supportsQR && (
                    <Alert className="border-blue-500/20 bg-blue-500/10 text-blue-300">
                      <Info className="h-4 w-4 text-blue-400" aria-hidden="true" />
                      <AlertDescription className="text-blue-300/90">
                        No hay ligas con modo Completo que soporten códigos QR
                      </AlertDescription>
                    </Alert>
                  )}

                  <QueryState
                    query={teamsQuery}
                    isEmpty={(data) => data.data.length === 0}
                    loadingLabel="Cargando equipos…"
                    empty={<EmptyState title="No hay equipos" description="Crea equipos primero en la sección de Equipos" />}
                  >
                    {(teamsRes) => (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Button size="sm" className={ghost} onClick={() => setIds(teamsRes.data.map((t) => t.id))}>
                              Seleccionar todos
                            </Button>
                            <Button size="sm" className={ghost} onClick={() => setIds([])}>
                              Deseleccionar todos
                            </Button>
                          </div>
                          <ul className="space-y-2">
                            {teamsRes.data.map((team) => (
                              <li key={team.id}>
                                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-slate-800/50 p-3 hover:bg-white/10">
                                  <input
                                    type="checkbox"
                                    className="rounded"
                                    checked={selectedIds.includes(team.id)}
                                    onChange={() => toggle(team.id)}
                                    aria-label={`Seleccionar ${team.name}`}
                                  />
                                  <span className="flex-1">
                                    <span className="block font-medium text-white">{team.name}</span>
                                    <span className="block text-sm text-gray-400">{team.slug}</span>
                                  </span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                          <Button
                            onClick={run}
                            disabled={processing || selectedIds.length === 0 || !supportsQR}
                            size="lg"
                            className="w-full max-w-md border-0 bg-blue-500/80 text-white shadow-lg backdrop-blur-md hover:bg-blue-500/90"
                          >
                            {processing ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                Actualizando QR Codes...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-5 w-5" aria-hidden="true" />
                                {allSelected ? 'Actualizar Todos los QR Codes' : `Actualizar QR (${selectedIds.length} equipos)`}
                              </>
                            )}
                          </Button>
                          {processing && (
                            <div className="w-full max-w-md space-y-2">
                              <Progress value={progress.percent} className="h-2 w-full bg-white/10" aria-label="Progreso" />
                              <p className="text-center text-sm text-white/70 drop-shadow">
                                {progress.total > 0
                                  ? `Procesando ${Math.round(progress.percent)}% (${done}/${progress.total} jugadores)`
                                  : `Leyendo plantillas… ${Math.round(progress.percent)}%`}
                              </p>
                            </div>
                          )}
                        </div>

                        {runError && (
                          <p role="alert" className="text-sm text-red-400">
                            {runError}
                          </p>
                        )}
                        {result && !processing && <QRResults result={result} />}
                      </div>
                    )}
                  </QueryState>
                </div>
              )
            }}
          </QueryState>

          <QRInfo />
        </CardContent>
      </Card>
    </div>
  )
}
