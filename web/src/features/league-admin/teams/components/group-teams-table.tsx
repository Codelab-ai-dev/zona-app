import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { GROUP_LETTERS } from '../groups-logic'
import type { Team } from '../types'

interface GroupTeamsTableProps {
  teams: Team[]
  failed: Record<string, string>
  disabled: boolean
  onAssign: (teamId: string, group: string) => void
  /** Stacked card (unassigned) or compact row (inside a group card). */
  compact?: boolean
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

/** Teams with a per-row group selector; failed PATCHes are highlighted per team. */
export function GroupTeamsTable({ teams, failed, disabled, onAssign, compact }: GroupTeamsTableProps) {
  const select = (team: Team, className: string) => (
    <Select value={team.group_name ?? ''} onValueChange={(value) => onAssign(team.id, value)} disabled={disabled}>
      <SelectTrigger className={`border-white/30 bg-white/10 text-white backdrop-blur-md ${className}`} aria-label={`Grupo de ${team.name}`}>
        <SelectValue placeholder="Seleccionar grupo" />
      </SelectTrigger>
      <SelectContent className="border-white/20 bg-gray-700/95 backdrop-blur-xl">
        {GROUP_LETTERS.map((letter) => (
          <SelectItem key={letter} value={letter} className="text-white">
            Grupo {letter}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  const avatar = (team: Team, size: string, text: string) => (
    <Avatar className={`${size} border border-white/30`}>
      {team.logo && <AvatarImage src={team.logo} alt={team.name} />}
      <AvatarFallback className={`bg-blue-500/80 font-bold text-white ${text}`}>{initials(team.name)}</AvatarFallback>
    </Avatar>
  )

  if (!compact) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <div key={team.id} className={`rounded-lg border p-3 backdrop-blur-md ${failed[team.id] ? 'border-red-400/50 bg-red-500/10' : 'border-white/20 bg-white/10'}`}>
            <div className="mb-2 flex items-center space-x-3">
              {avatar(team, 'h-10 w-10', 'text-sm')}
              <span className="flex-1 font-medium text-white drop-shadow">{team.name}</span>
            </div>
            {select(team, 'w-full')}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <div
          key={team.id}
          className={`flex items-center justify-between rounded-lg border p-3 transition-colors backdrop-blur-md hover:bg-white/10 ${failed[team.id] ? 'border-red-400/50 bg-red-500/10' : 'border-white/10 bg-white/5'}`}
        >
          <div className="flex items-center space-x-3">
            {avatar(team, 'h-8 w-8', 'text-xs')}
            <span className="font-medium text-white drop-shadow">{team.name}</span>
          </div>
          {select(team, 'w-32 text-sm')}
        </div>
      ))}
    </div>
  )
}
