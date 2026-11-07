import { useState } from 'react'

import { AlertCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import { usePostMatchFinalizedNotification, usePostMatchResult, useTeamPlayers, useTriggerEmbedding } from '../api'
import type { MatchWithRelations } from '../types'
import { CardInput, GoalInput } from './result-event-inputs'
import { buildResultRequest, hasUnpickedPlayer, type FormCard, type FormGoal, type ResultFormState, type Side } from './result-form'

interface MatchResultDialogProps {
  match: MatchWithRelations
  leagueId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (matchId: string) => void
}

const SIDES: Side[] = ['home', 'away']

/** Dialog to enter match result (score, goals, cards, observations). */
export function MatchResultDialog({ match, leagueId, open, onOpenChange, onSaved }: MatchResultDialogProps) {
  const postResult = usePostMatchResult()
  const triggerEmbedding = useTriggerEmbedding()
  const notifyFinalized = usePostMatchFinalizedNotification()

  const homePlayers = useTeamPlayers(match.home_team_id)
  const awayPlayers = useTeamPlayers(match.away_team_id)
  const rosters = { home: homePlayers.data?.data ?? [], away: awayPlayers.data?.data ?? [] }
  const teamNames = { home: match.home_team_name, away: match.away_team_name }

  const [form, setForm] = useState<ResultFormState>({ homeScore: 0, awayScore: 0, goals: [], cards: [], observations: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const patchGoal = (id: string, patch: Partial<FormGoal>) =>
    setForm((f) => ({ ...f, goals: f.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
  const patchCard = (id: string, patch: Partial<FormCard>) =>
    setForm((f) => ({ ...f, cards: f.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))

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

    toast.success('Resultado registrado exitosamente')
    // The result is saved; follow-ups failing must not undo or hide that.
    const followUps = await Promise.allSettled([
      triggerEmbedding.mutateAsync({
        trigger_type: 'match_result_update',
        league_id: leagueId,
        tournament_id: match.tournament_id,
        match_id: match.id,
      }),
      notifyFinalized.mutateAsync(match.id),
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
          <DialogTitle>Ingresar resultado</DialogTitle>
          <DialogDescription>
            {teamNames.home} vs {teamNames.away}
          </DialogDescription>
        </DialogHeader>

        <Alert className="mb-4">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertDescription>Al guardar, se reemplazará completamente el resultado anterior (si existe).</AlertDescription>
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

          <TabsContent value="goals" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {SIDES.map((side) => (
                <div key={side} className="space-y-2">
                  <h3 className="font-semibold text-sm">{teamNames[side]}</h3>
                  {form.goals
                    .filter((g) => g.side === side)
                    .map((goal) => (
                      <GoalInput
                        key={goal.id}
                        teamName={teamNames[side]}
                        players={rosters[side]}
                        minute={goal.minute}
                        playerId={goal.player_id}
                        goalType={goal.goal_type}
                        onMinute={(minute) => patchGoal(goal.id, { minute })}
                        onPlayer={(player_id) => patchGoal(goal.id, { player_id })}
                        onGoalType={(goal_type) => patchGoal(goal.id, { goal_type })}
                        onRemove={() => setForm((f) => ({ ...f, goals: f.goals.filter((g) => g.id !== goal.id) }))}
                      />
                    ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      setForm((f) => ({ ...f, goals: [...f.goals, { id: crypto.randomUUID(), side, player_id: '', minute: 1, goal_type: 'normal' }] }))
                    }
                  >
                    <Plus className="size-3 mr-1" aria-hidden="true" /> Agregar gol ({teamNames[side]})
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cards" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {SIDES.map((side) => (
                <div key={side} className="space-y-2">
                  <h3 className="font-semibold text-sm">{teamNames[side]}</h3>
                  {form.cards
                    .filter((c) => c.side === side)
                    .map((card) => (
                      <CardInput
                        key={card.id}
                        teamName={teamNames[side]}
                        players={rosters[side]}
                        minute={card.minute}
                        playerId={card.player_id}
                        cardType={card.card_type}
                        onMinute={(minute) => patchCard(card.id, { minute })}
                        onPlayer={(player_id) => patchCard(card.id, { player_id })}
                        onCardType={(card_type) => patchCard(card.id, { card_type })}
                        onRemove={() => setForm((f) => ({ ...f, cards: f.cards.filter((c) => c.id !== card.id) }))}
                      />
                    ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      setForm((f) => ({ ...f, cards: [...f.cards, { id: crypto.randomUUID(), side, player_id: '', minute: 1, card_type: 'yellow' }] }))
                    }
                  >
                    <Plus className="size-3 mr-1" aria-hidden="true" /> Agregar tarjeta ({teamNames[side]})
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

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
