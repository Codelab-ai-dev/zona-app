import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

import type { Player } from '../types'

interface PlayerRowProps {
  player: Player
}

export function PlayerRow({ player }: PlayerRowProps) {
  const initials = player.name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-4">
      <Avatar>
        {player.photo && <AvatarImage src={player.photo} alt={player.name} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-semibold">{player.name}</p>
        <p className="text-sm text-muted-foreground">
          #{player.jersey_number} · {player.position}
        </p>
      </div>
      {player.is_active ? (
        <Badge>Activo</Badge>
      ) : (
        <Badge variant="secondary">Inactivo</Badge>
      )}
    </div>
  )
}
