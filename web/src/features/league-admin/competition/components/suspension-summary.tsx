import { Badge } from '@/components/ui/badge'
import { useTeamPlayers } from '@/features/league-admin/matches/api'

import type { Suspension } from '../types'
import { suspensionTypeLabels } from './suspension-card'

const rowClass = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1'
const labelClass = 'text-[10px] text-gray-500 uppercase tracking-wide'

/** Read-only recap shown at the top of the edit dialog (player, team, type, matches served). */
export function SuspensionSummary({ suspension, teamName }: { suspension: Suspension; teamName?: string }) {
  const players = useTeamPlayers(suspension.team_id)
  const player = players.data?.data.find((p) => p.id === suspension.player_id)

  return (
    <div className="p-4 bg-slate-800/50 rounded-lg border border-white/10 space-y-3">
      <div className={rowClass}>
        <span className={labelClass}>Jugador</span>
        <span className="font-medium text-white text-sm flex items-center gap-2">
          {player?.name ?? (players.isPending ? 'Cargando…' : 'Jugador desconocido')}
          {player && <Badge className="bg-slate-700 text-white border-0 text-xs">#{player.jersey_number}</Badge>}
        </span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Equipo</span>
        <span className="font-medium text-white text-sm">{teamName ?? '—'}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Tipo</span>
        <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">{suspensionTypeLabels[suspension.suspension_type]}</Badge>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Partidos cumplidos</span>
        <span className="font-medium text-white text-sm">{suspension.matches_served}</span>
      </div>
    </div>
  )
}
