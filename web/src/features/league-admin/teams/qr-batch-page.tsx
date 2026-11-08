import { useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, QrCode, Users } from 'lucide-react'

import { EmptyState, QueryState } from '@/components/states'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

import { useQRBatchUpdate, useTeamsByLeague, type QRRunResult } from './api'
import { LeaguePicker } from './components/league-picker'
import { useSelectedLeague } from './use-selected-league'

function ResultSummary({ result }: { result: QRRunResult }) {
  const ok = result.failures.length === 0
  return (
    <div role="status" className="space-y-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
      <div className="flex items-start gap-2">
        {ok ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        )}
        <div>
          <p className="font-medium text-white">{!ok ? 'Actualización parcial' : result.updated === 0 ? 'No hay jugadores para actualizar' : 'Actualización completada exitosamente'}</p>
          <p className="mt-1 text-sm text-white/70">Se actualizaron {result.updated} códigos QR</p>
        </div>
      </div>
      {!ok && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-white">Errores:</p>
          <ul className="list-disc pl-5">
            {result.failures.map((failure) => (
              <li key={failure.label} className="text-sm text-red-400">
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
    <div className="py-6">
      <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <QrCode className="h-5 w-5 text-blue-300" aria-hidden="true" />
            <h1>Actualización Masiva de QR</h1>
          </CardTitle>
          <CardDescription className="text-white/80 drop-shadow">
            Regenera los códigos QR de todos los jugadores de los equipos seleccionados para asegurar que funcionen correctamente con la app móvil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                  <Alert className="border-yellow-500/20 bg-yellow-500/10 text-yellow-300">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" aria-hidden="true" />
                    <AlertDescription className="text-yellow-300/90">Selecciona los equipos cuyos jugadores necesitan actualizar sus códigos QR.</AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button size="sm" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setIds(teamsRes.data.map((t) => t.id))}>
                        Seleccionar todos
                      </Button>
                      <Button size="sm" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setIds([])}>
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

                  <Button onClick={run} disabled={processing || selectedIds.length === 0} className="w-full gap-2 border-0 bg-blue-500/80 text-white hover:bg-blue-500/90">
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
                    <p role="alert" className="text-sm text-red-400">
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
      <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
        <h4 className="mb-3 flex items-center gap-2 font-semibold text-white">
          <Users className="h-4 w-4 text-blue-300" aria-hidden="true" />
          ¿Qué hace esta función?
        </h4>
        <ul className="ml-2 list-inside list-disc space-y-1 text-sm text-white/70">
          <li>Encuentra todos los jugadores de los equipos seleccionados</li>
          <li>Regenera el código QR de cada jugador con el formato correcto</li>
          <li>Muestra un reporte detallado de los resultados</li>
        </ul>
      </div>
        </CardContent>
      </Card>
    </div>
  )
}
