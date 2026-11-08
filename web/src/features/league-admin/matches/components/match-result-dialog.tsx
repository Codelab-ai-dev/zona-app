import { useState } from 'react'

import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import {
  useMatchById,
  useMatchRefereeReport,
  usePostMatchFinalizedNotification,
  usePostMatchResult,
  useTeamPlayers,
  useTriggerEmbedding,
} from '../api'
import type { MatchWithRelations } from '../types'
import { ResultEventsTabs } from './result-events-tabs'
import { buildResultRequest, EMPTY_FORM, formFromMatch, hasUnpickedPlayer, type ResultFormState } from './result-form'

interface MatchResultDialogProps {
  match: MatchWithRelations
  leagueId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (matchId: string) => void
}

/**
 * Dialog to enter or edit a match result (score, goals with assist, cards,
 * observations). A finished match is prefilled from its stored result.
 */
export function MatchResultDialog(props: MatchResultDialogProps) {
  const { match, open, onOpenChange } = props
  const isEdit = match.status === 'finished'
  const detail = useMatchById(isEdit ? match.id : undefined)
  const report = useMatchRefereeReport(isEdit ? match.id : undefined)

  if (!isEdit) return <ResultDialogBody {...props} initial={EMPTY_FORM} isEdit={false} />
  if (detail.isPending || report.isPending || detail.isError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Marcador</DialogTitle>
            <DialogDescription>
              {match.home_team_name} vs {match.away_team_name}
            </DialogDescription>
          </DialogHeader>
          {detail.isError ? (
            <div role="alert" className="space-y-3 text-sm text-destructive">
              <p>No se pudo cargar el resultado actual: {detail.error.message}. Para no perder goles ni tarjetas, no se puede editar.</p>
              <Button variant="outline" onClick={() => void detail.refetch()}>Reintentar</Button>
            </div>
          ) : (
            <p role="status" className="text-sm text-muted-foreground">Cargando resultado actual…</p>
          )}
        </DialogContent>
      </Dialog>
    )
  }
  const initial = formFromMatch({ ...match, ...detail.data }, report.data?.general_observations ?? '')
  return <ResultDialogBody {...props} initial={initial} isEdit />
}

function ResultDialogBody({
  match,
  leagueId,
  open,
  onOpenChange,
  onSaved,
  initial,
  isEdit,
}: MatchResultDialogProps & { initial: ResultFormState; isEdit: boolean }) {
  const postResult = usePostMatchResult()
  const triggerEmbedding = useTriggerEmbedding()
  const notifyFinalized = usePostMatchFinalizedNotification()

  const homePlayers = useTeamPlayers(match.home_team_id)
  const awayPlayers = useTeamPlayers(match.away_team_id)
  const rosters = { home: homePlayers.data?.data ?? [], away: awayPlayers.data?.data ?? [] }
  const teamNames = { home: match.home_team_name, away: match.away_team_name }

  const [form, setForm] = useState<ResultFormState>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handlePostResult = async () => {
    setErrors({})
    if (hasUnpickedPlayer(form)) {
      setErrors({ player_id: 'Selecciona el jugador de cada gol y tarjeta.' })
      return
    }
    try {
      await postResult.mutateAsync({ matchId: match.id, data: buildResultRequest(match, form) })
    } catch (err) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fields).length > 0) setErrors(err.fields)
        toast.error(err.message)
      } else {
        toast.error('Error al registrar resultado')
      }
      return
    }

    toast.success(isEdit ? 'Marcador actualizado exitosamente' : 'Resultado registrado exitosamente')
    // The result is saved; follow-ups failing must not undo or hide that.
    const followUps = await Promise.allSettled([
      triggerEmbedding.mutateAsync({
        trigger_type: 'match_result_update',
        league_id: leagueId,
        tournament_id: match.tournament_id,
        match_id: match.id,
      }),
      // A correction refreshes the knowledge base but doesn't announce the match again.
      isEdit ? Promise.resolve() : notifyFinalized.mutateAsync(match.id),
    ])
    if (followUps.some((r) => r.status === 'rejected')) {
      toast.warning('El resultado se guardó, pero no se pudo actualizar el conocimiento o enviar la notificación del partido.')
    }
    onSaved(match.id)
  }

  const pending = postResult.isPending || triggerEmbedding.isPending || notifyFinalized.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Marcador' : 'Ingresar resultado'}</DialogTitle>
          <DialogDescription>
            {teamNames.home} vs {teamNames.away}
          </DialogDescription>
        </DialogHeader>

        <Alert className="mb-4">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertDescription>Al guardar, se reemplazará completamente el resultado anterior (si existe) y la tabla de posiciones se recalcula.</AlertDescription>
        </Alert>

        <Tabs defaultValue="score" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="score">Marcador</TabsTrigger>
            <TabsTrigger value="goals">Goles</TabsTrigger>
            <TabsTrigger value="cards">Tarjetas</TabsTrigger>
            <TabsTrigger value="observations">Observaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="score" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="home-score">Goles {teamNames.home}</Label>
                <Input
                  id="home-score"
                  type="number"
                  min="0"
                  value={form.homeScore}
                  onChange={(e) => setForm({ ...form, homeScore: Number(e.target.value) })}
                  disabled={pending}
                  aria-invalid={!!errors.home_score}
                />
              </div>
              <div className="flex items-end justify-center pb-2">
                <span className="text-lg font-bold">
                  {form.homeScore} - {form.awayScore}
                </span>
              </div>
              <div>
                <Label htmlFor="away-score">Goles {teamNames.away}</Label>
                <Input
                  id="away-score"
                  type="number"
                  min="0"
                  value={form.awayScore}
                  onChange={(e) => setForm({ ...form, awayScore: Number(e.target.value) })}
                  disabled={pending}
                  aria-invalid={!!errors.away_score}
                />
              </div>
            </div>
          </TabsContent>

          <ResultEventsTabs form={form} setForm={setForm} teamNames={teamNames} rosters={rosters} />

          <TabsContent value="observations" className="space-y-4">
            <div>
              <Label htmlFor="observations">Observaciones (opcional)</Label>
              <Textarea
                id="observations"
                placeholder="Ej. Lluvia, jugador lesionado en el minuto 30, espectadores agresivos, etc."
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                disabled={pending}
                className="mt-2 min-h-32"
              />
            </div>
          </TabsContent>
        </Tabs>

        {Object.keys(errors).length > 0 && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <ul className="list-inside list-disc space-y-1">
              {Object.entries(errors).map(([field, msg]) => (
                <li key={field}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handlePostResult} disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar resultado'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
