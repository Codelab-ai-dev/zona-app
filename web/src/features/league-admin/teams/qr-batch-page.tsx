import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

import { EmptyState, QueryState } from '@/components/states'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

import { useQRBatchUpdate, useTeamsByLeague, type QRRunResult } from './api'
import { LeaguePicker } from './components/league-picker'
import { useSelectedLeague } from './use-selected-league'

function ResultSummary({ result }: { result: QRRunResult }) {
  const ok = result.failures.length === 0
  return (
    <div role="status" className="space-y-3 rounded-lg border bg-muted/50 p-4">
      <div className="flex items-start gap-2">
        {ok ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        )}
        <div>
          <p className="font-medium">{!ok ? 'Actualización parcial' : result.updated === 0 ? 'No hay jugadores para actualizar' : 'Actualización completada exitosamente'}</p>
          <p className="mt-1 text-sm text-muted-foreground">Se actualizaron {result.updated} códigos QR</p>
        </div>
      </div>
      {!ok && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Errores:</p>
          <ul className="list-disc pl-5">
            {result.failures.map((failure) => (
              <li key={failure.label} className="text-sm text-destructive">
                {failure.label}: {failure.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function QRBatchPage() {
  const { leaguesQuery, leagueId, setLeagueId } = useSelectedLeague()
  // Selection belongs to a league: switching league drops it.
  const [selection, setSelection] = useState({ leagueId: '', ids: [] as string[] })
  const selectedIds = selection.leagueId === leagueId ? selection.ids : []
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<QRRunResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  const teamsQuery = useTeamsByLeague(leagueId)
  const qrMutation = useQRBatchUpdate()

  const setIds = (ids: string[]) => setSelection({ leagueId, ids })
  const toggle = (id: string) => setIds(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])

  const run = async () => {
    const teams = (teamsQuery.data?.data ?? []).filter((t) => selectedIds.includes(t.id)).map((t) => ({ id: t.id, name: t.name }))
    setProgress(0)
    setResult(null)
    setRunError(null)
    try {
      setResult(await qrMutation.mutateAsync({ leagueId, teams, onProgress: setProgress }))
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Error en la actualización')
    }
  }

  const processing = qrMutation.isPending

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Actualización Masiva de QR</h1>
        <p className="mt-1 text-muted-foreground">Regenera códigos QR para todos los jugadores de equipos seleccionados</p>
      </div>

      <QueryState
        query={leaguesQuery}
        isEmpty={(data) => data.data.length === 0}
        loadingLabel="Cargando ligas…"
        empty={<EmptyState title="No hay ligas" description="No administras ninguna liga" />}
      >
        {(leaguesRes) => (
          <div className="space-y-6">
            <LeaguePicker leagues={leaguesRes.data} value={leagueId} onChange={setLeagueId} />

            <QueryState
              query={teamsQuery}
              isEmpty={(data) => data.data.length === 0}
              loadingLabel="Cargando equipos…"
              empty={<EmptyState title="No hay equipos" description="Crea equipos primero en la sección de Equipos" />}
            >
              {(teamsRes) => (
                <div className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription>Selecciona los equipos cuyos jugadores necesitan actualizar sus códigos QR.</AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIds(teamsRes.data.map((t) => t.id))}>
                        Seleccionar todos
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIds([])}>
                        Deseleccionar todos
                      </Button>
                    </div>
                    <ul className="space-y-2">
                      {teamsRes.data.map((team) => (
                        <li key={team.id}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedIds.includes(team.id)}
                              onChange={() => toggle(team.id)}
                              aria-label={`Seleccionar ${team.name}`}
                            />
                            <span className="flex-1">
                              <span className="block font-medium">{team.name}</span>
                              <span className="block text-sm text-muted-foreground">{team.slug}</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button onClick={run} disabled={processing || selectedIds.length === 0} className="w-full gap-2">
                    {processing ? (
                      <>
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        Procesando… {Math.round(progress)}%
                      </>
                    ) : (
                      `Actualizar QR (${selectedIds.length} equipos)`
                    )}
                  </Button>

                  {processing && <Progress value={progress} className="h-2" aria-label="Progreso" />}
                  {runError && (
                    <p role="alert" className="text-sm text-destructive">
                      {runError}
                    </p>
                  )}
                  {result && <ResultSummary result={result} />}
                </div>
              )}
            </QueryState>
          </div>
        )}
      </QueryState>
    </div>
  )
}
