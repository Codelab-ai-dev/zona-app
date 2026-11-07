import { useState } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError } from '@/lib/api/client'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

import { usePostMatchResult, useTriggerEmbedding } from '../api'
import type { MatchWithRelations, PostMatchResultRequest, PostGoalRequest, PostCardRequest } from '../types'

interface MatchResultDialogProps {
  match: MatchWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (matchId: string) => void
}

interface FormGoal extends PostGoalRequest {
  id: string
}

interface FormCard extends PostCardRequest {
  id: string
}

/** Dialog to enter match result (goals, cards, incidents). */
export function MatchResultDialog({ match, open, onOpenChange, onSaved }: MatchResultDialogProps) {
  const postResult = usePostMatchResult()
  const triggerEmbedding = useTriggerEmbedding()

  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [homeGoals, setHomeGoals] = useState<FormGoal[]>([])
  const [awayGoals, setAwayGoals] = useState<FormGoal[]>([])
  const [homeCards, setHomeCards] = useState<FormCard[]>([])
  const [awayCards, setAwayCards] = useState<FormCard[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handlePostResult = async () => {
    setErrors({})
    try {
      const data: PostMatchResultRequest = {
        home_score: homeScore,
        away_score: awayScore,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        goals: [...homeGoals, ...awayGoals].map(({ id, ...g }) => g),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        cards: [...homeCards, ...awayCards].map(({ id, ...c }) => c),
      }

      await postResult.mutateAsync({ matchId: match.id, data })
      toast.success('Resultado registrado exitosamente')

      // Fire-and-forget embedding trigger
      triggerEmbedding.mutate({
        trigger_type: 'match_result_update',
        league_id: 'TODO', // This should come from context
        tournament_id: match.tournament_id,
        match_id: match.id,
      })

      onSaved(match.id)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) {
          setErrors(err.fields)
        }
        toast.error(err.message)
      } else {
        toast.error('Error al registrar resultado')
      }
    }
  }

  const addGoal = (isHome: boolean) => {
    const id = crypto.randomUUID()
    const goal: FormGoal = { id, player_id: '', minute: 0, goal_type: 'normal' }
    if (isHome) setHomeGoals([...homeGoals, goal])
    else setAwayGoals([...awayGoals, goal])
  }

  const removeGoal = (isHome: boolean, id: string) => {
    if (isHome) setHomeGoals(homeGoals.filter((g) => g.id !== id))
    else setAwayGoals(awayGoals.filter((g) => g.id !== id))
  }

  const updateGoal = (isHome: boolean, id: string, field: keyof FormGoal, value: unknown) => {
    const setter = isHome ? setHomeGoals : setAwayGoals
    const goals = isHome ? homeGoals : awayGoals
    setter(goals.map((g) => (g.id === id ? { ...g, [field]: value } : g)))
  }

  const addCard = (isHome: boolean) => {
    const id = crypto.randomUUID()
    const card: FormCard = { id, player_id: '', card_type: 'yellow', minute: 0 }
    if (isHome) setHomeCards([...homeCards, card])
    else setAwayCards([...awayCards, card])
  }

  const removeCard = (isHome: boolean, id: string) => {
    if (isHome) setHomeCards(homeCards.filter((c) => c.id !== id))
    else setAwayCards(awayCards.filter((c) => c.id !== id))
  }

  const updateCard = (isHome: boolean, id: string, field: keyof FormCard, value: unknown) => {
    const setter = isHome ? setHomeCards : setAwayCards
    const cards = isHome ? homeCards : awayCards
    setter(cards.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ingresar resultado</DialogTitle>
          <DialogDescription>
            {match.home_team?.name ?? 'TBD'} vs {match.away_team?.name ?? 'TBD'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="score" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="score">Marcador</TabsTrigger>
            <TabsTrigger value="goals">Goles</TabsTrigger>
            <TabsTrigger value="cards">Tarjetas</TabsTrigger>
          </TabsList>

          {/* Score tab */}
          <TabsContent value="score" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="home-score">Goles {match.home_team?.name}</Label>
                <Input
                  id="home-score"
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(Number(e.target.value))}
                  disabled={postResult.isPending}
                  aria-invalid={!!errors.home_score}
                />
              </div>
              <div className="flex items-end justify-center pb-2">
                <span className="text-lg font-bold">{homeScore} - {awayScore}</span>
              </div>
              <div>
                <Label htmlFor="away-score">Goles {match.away_team?.name}</Label>
                <Input
                  id="away-score"
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(Number(e.target.value))}
                  disabled={postResult.isPending}
                  aria-invalid={!!errors.away_score}
                />
              </div>
            </div>
          </TabsContent>

          {/* Goals tab */}
          <TabsContent value="goals" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Home team goals */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{match.home_team?.name}</h3>
                {homeGoals.map((goal) => (
                  <GoalInput
                    key={goal.id}
                    goal={goal}
                    onUpdate={(field, value) => updateGoal(true, goal.id, field, value)}
                    onRemove={() => removeGoal(true, goal.id)}
                  />
                ))}
                <Button size="sm" variant="outline" onClick={() => addGoal(true)} className="w-full">
                  <Plus className="size-3 mr-1" aria-hidden="true" /> Agregar gol
                </Button>
              </div>

              {/* Away team goals */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{match.away_team?.name}</h3>
                {awayGoals.map((goal) => (
                  <GoalInput
                    key={goal.id}
                    goal={goal}
                    onUpdate={(field, value) => updateGoal(false, goal.id, field, value)}
                    onRemove={() => removeGoal(false, goal.id)}
                  />
                ))}
                <Button size="sm" variant="outline" onClick={() => addGoal(false)} className="w-full">
                  <Plus className="size-3 mr-1" aria-hidden="true" /> Agregar gol
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Cards tab */}
          <TabsContent value="cards" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Home team cards */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{match.home_team?.name}</h3>
                {homeCards.map((card) => (
                  <CardInput
                    key={card.id}
                    card={card}
                    onUpdate={(field, value) => updateCard(true, card.id, field, value)}
                    onRemove={() => removeCard(true, card.id)}
                  />
                ))}
                <Button size="sm" variant="outline" onClick={() => addCard(true)} className="w-full">
                  <Plus className="size-3 mr-1" aria-hidden="true" /> Agregar tarjeta
                </Button>
              </div>

              {/* Away team cards */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{match.away_team?.name}</h3>
                {awayCards.map((card) => (
                  <CardInput
                    key={card.id}
                    card={card}
                    onUpdate={(field, value) => updateCard(false, card.id, field, value)}
                    onRemove={() => removeCard(false, card.id)}
                  />
                ))}
                <Button size="sm" variant="outline" onClick={() => addCard(false)} className="w-full">
                  <Plus className="size-3 mr-1" aria-hidden="true" /> Agregar tarjeta
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {Object.entries(errors).length > 0 && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <ul className="list-inside list-disc space-y-1">
              {Object.entries(errors).map(([field, msg]) => (
                <li key={field}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={postResult.isPending}>
            Cancelar
          </Button>
          <Button onClick={handlePostResult} disabled={postResult.isPending}>
            {postResult.isPending ? 'Guardando…' : 'Guardar resultado'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface GoalInputProps {
  goal: FormGoal
  onUpdate: (field: keyof FormGoal, value: unknown) => void
  onRemove: () => void
}

function GoalInput({ goal, onUpdate, onRemove }: GoalInputProps) {
  return (
    <Card className="p-3">
      <div className="space-y-2">
        <Input
          type="number"
          placeholder="Minuto"
          value={goal.minute}
          onChange={(e) => onUpdate('minute', Number(e.target.value))}
          className="text-sm"
        />
        <div className="flex gap-2">
          <Input placeholder="ID jugador" value={goal.player_id} onChange={(e) => onUpdate('player_id', e.target.value)} className="flex-1 text-sm" />
          <select
            value={goal.goal_type}
            onChange={(e) => onUpdate('goal_type', e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="normal">Normal</option>
            <option value="penalty">Penal</option>
            <option value="own_goal">Autogol</option>
            <option value="free_kick">Tiro libre</option>
          </select>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

interface CardInputProps {
  card: FormCard
  onUpdate: (field: keyof FormCard, value: unknown) => void
  onRemove: () => void
}

function CardInput({ card, onUpdate, onRemove }: CardInputProps) {
  return (
    <Card className="p-3">
      <div className="space-y-2">
        <Input
          type="number"
          placeholder="Minuto"
          value={card.minute}
          onChange={(e) => onUpdate('minute', Number(e.target.value))}
          className="text-sm"
        />
        <div className="flex gap-2">
          <Input placeholder="ID jugador" value={card.player_id} onChange={(e) => onUpdate('player_id', e.target.value)} className="flex-1 text-sm" />
          <select
            value={card.card_type}
            onChange={(e) => onUpdate('card_type', e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="yellow">Amarilla</option>
            <option value="red">Roja</option>
          </select>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
