import { Clock } from 'lucide-react'

import { glassTile } from '../glass'
import type { TeamPlayerStats } from '../types'
import { StatTile } from './overview-panels'

const sum = (players: TeamPlayerStats[], pick: (p: TeamPlayerStats) => number) => players.reduce((total, p) => total + pick(p), 0)
const average = (total: number, count: number, digits: number) => (count > 0 ? (total / count).toFixed(digits) : '0')

const section = 'text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg'

/** Goals per player: a tile next to the team goals ("Rendimiento Ofensivo"). */
export function GoalsPerPlayerTile({ players }: { players: TeamPlayerStats[] }) {
  return (
    <StatTile
      label="Goles por Jugador"
      value={average(sum(players, (p) => p.goals), players.length, 1)}
      valueClass="text-purple-400"
      tint="p-4 backdrop-blur-md bg-purple-500/20 rounded-xl border border-purple-300/30 shadow-lg"
    />
  )
}

/** Player-derived tiles of the original team-stats: cards per player, players without cards. */
export function DisciplineTiles({ players }: { players: TeamPlayerStats[] }) {
  const cards = sum(players, (p) => p.yellow_cards + p.red_cards)
  return (
    <>
      <StatTile label="Tarjetas por Jugador" value={average(cards, players.length, 1)} />
      <StatTile
        label="Jugadores sin Tarjetas"
        value={players.filter((p) => p.yellow_cards === 0 && p.red_cards === 0).length}
        valueClass="text-green-400"
      />
    </>
  )
}

/** "Participación": matches, minutes and active players. */
export function ParticipationSection({ players }: { players: TeamPlayerStats[] }) {
  const minutes = sum(players, (p) => p.minutes_played)
  return (
    <div>
      <h3 className={section}>
        <Clock className="w-5 h-5 mr-2 text-white/80" aria-hidden="true" />
        Participación
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Partidos Jugados (Total)" value={sum(players, (p) => p.matches_played)} tint={glassTile} />
        <StatTile label="Minutos Jugados (Total)" value={`${minutes.toLocaleString('es-MX')}'`} />
        <StatTile label="Promedio Minutos por Jugador" value={`${players.length > 0 ? Math.round(minutes / players.length) : 0}'`} />
        <StatTile label="Jugadores Activos" value={players.filter((p) => p.matches_played > 0).length} valueClass="text-green-400" />
      </div>
    </div>
  )
}
