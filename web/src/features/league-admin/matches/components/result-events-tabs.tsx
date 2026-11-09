import { Plus } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

import { Button } from '@/components/ui/button'
import { TabsContent } from '@/components/ui/tabs'

import type { Player } from '../api'
import { CardInput, GoalInput } from './result-event-inputs'
import type { FormCard, FormGoal, ResultFormState, Side } from './result-form'

const SIDES: Side[] = ['home', 'away']

interface EventsTabsProps {
  form: ResultFormState
  setForm: Dispatch<SetStateAction<ResultFormState>>
  teamNames: Record<Side, string>
  rosters: Record<Side, Player[]>
  rostersLoading?: boolean
}

/** "Goles" and "Tarjetas" tab bodies of the result dialog, one column per team. */
export function ResultEventsTabs({ form, setForm, teamNames, rosters, rostersLoading = false }: EventsTabsProps) {
  const patchGoal = (id: string, patch: Partial<FormGoal>) =>
    setForm((f) => ({ ...f, goals: f.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
  const patchCard = (id: string, patch: Partial<FormCard>) =>
    setForm((f) => ({ ...f, cards: f.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))

  return (
    <>
      <TabsContent value="goals" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {SIDES.map((side) => (
            <div key={side} className="space-y-2">
              <h3 className="font-semibold text-sm">{teamNames[side]} ({form.goals.filter((g) => g.side === side).length})</h3>
              {!rostersLoading && rosters[side].length === 0 && (
                <p role="status" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-600">No hay jugadores registrados</p>
              )}
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
                    assistId={goal.assist_player_id}
                    onMinute={(minute) => patchGoal(goal.id, { minute })}
                    onPlayer={(player_id) => patchGoal(goal.id, { player_id, assist_player_id: goal.assist_player_id === player_id ? '' : goal.assist_player_id })}
                    onGoalType={(goal_type) => patchGoal(goal.id, { goal_type })}
                    onAssist={(assist_player_id) => patchGoal(goal.id, { assist_player_id })}
                    onRemove={() => setForm((f) => ({ ...f, goals: f.goals.filter((g) => g.id !== goal.id) }))}
                  />
                ))}
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={rosters[side].length === 0}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    goals: [...f.goals, { id: crypto.randomUUID(), side, player_id: '', minute: 1, goal_type: 'normal', assist_player_id: '' }],
                  }))
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
              {!rostersLoading && rosters[side].length === 0 && (
                <p role="status" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-600">No hay jugadores registrados</p>
              )}
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
                disabled={rosters[side].length === 0}
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
    </>
  )
}
