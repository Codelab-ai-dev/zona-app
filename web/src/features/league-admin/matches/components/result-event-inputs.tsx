import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { Player } from '../api'
import type { CardType, GoalType } from '../types'

const NATIVE_SELECT = 'rounded-md border border-input bg-background px-3 py-1 text-sm w-full'

interface BaseProps {
  teamName: string
  players: Player[]
  minute: number
  playerId: string
  onMinute: (minute: number) => void
  onPlayer: (playerId: string) => void
  onRemove: () => void
}

function EventFields({ teamName, players, minute, playerId, onMinute, onPlayer, onRemove, children }: BaseProps & { children: React.ReactNode }) {
  return (
    <Card className="p-3">
      <div className="space-y-2">
        <Input
          type="number"
          aria-label={`Minuto (${teamName})`}
          min="1"
          max="120"
          value={minute}
          onChange={(e) => onMinute(Number(e.target.value))}
          className="text-sm"
        />
        <Select value={playerId} onValueChange={onPlayer}>
          <SelectTrigger className="text-sm" aria-label={`Jugador (${teamName})`}>
            <SelectValue placeholder="Seleccionar jugador" />
          </SelectTrigger>
          <SelectContent>
            {players.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} {p.jersey_number ? `#${p.jersey_number}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {children}
        <Button size="sm" variant="ghost" onClick={onRemove} className="w-full">
          <Trash2 className="size-4 mr-1" aria-hidden="true" />
          Eliminar
        </Button>
      </div>
    </Card>
  )
}

export function GoalInput({ goalType, onGoalType, ...base }: BaseProps & { goalType: GoalType; onGoalType: (t: GoalType) => void }) {
  return (
    <EventFields {...base}>
      <select
        aria-label={`Tipo de gol (${base.teamName})`}
        value={goalType}
        onChange={(e) => onGoalType(e.target.value as GoalType)}
        className={NATIVE_SELECT}
      >
        <option value="normal">Normal</option>
        <option value="penalty">Penal</option>
        <option value="own_goal">Autogol</option>
        <option value="free_kick">Tiro libre</option>
      </select>
    </EventFields>
  )
}

export function CardInput({ cardType, onCardType, ...base }: BaseProps & { cardType: CardType; onCardType: (t: CardType) => void }) {
  return (
    <EventFields {...base}>
      <select
        aria-label={`Tipo de tarjeta (${base.teamName})`}
        value={cardType}
        onChange={(e) => onCardType(e.target.value as CardType)}
        className={NATIVE_SELECT}
      >
        <option value="yellow">Amarilla</option>
        <option value="red">Roja</option>
      </select>
    </EventFields>
  )
}
