import { Ban, CheckCircle, IdCard, Trash2 } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

import { glassOutlineButton } from '../glass'
import type { Player } from '../types'
import { initials } from '../utils'

function age(birthDate: string): number {
  const born = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - born.getUTCFullYear()
  if (now.getMonth() < born.getUTCMonth() || (now.getMonth() === born.getUTCMonth() && now.getDate() < born.getUTCDate())) years--
  return years
}

interface PlayerCardProps {
  player: Player
  suspended: boolean
  onCredential: () => void
  onDeactivate: () => void
}

/** One player of the Jugadores tab, in the original glass card. */
export function PlayerCard({ player, suspended, onCredential, onDeactivate }: PlayerCardProps) {
  return (
    <Card className={suspended ? 'border-red-400/50 backdrop-blur-xl bg-red-500/20 shadow-xl' : 'backdrop-blur-xl bg-white/10 border-white/20 shadow-xl'}>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12">
            {player.photo && <AvatarImage src={player.photo} alt={player.name} />}
            <AvatarFallback className="bg-blue-100 text-blue-800 font-bold">{initials(player.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base sm:text-lg font-semibold flex items-center text-white drop-shadow">
              {player.name}
              <span className="ml-2 text-sm font-bold text-green-400">#{player.jersey_number}</span>
            </p>
            <p className="text-sm text-white/70 drop-shadow">{player.position}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={player.is_active ? 'default' : 'secondary'} className="w-fit">
            {player.is_active ? 'Activo' : 'Inactivo'}
          </Badge>
          {suspended && (
            <Badge variant="destructive" className="w-fit flex items-center gap-1">
              <Ban className="w-3 h-3" aria-hidden="true" />
              Suspendido
            </Badge>
          )}
          {player.id_verified && (
            <Badge className="w-fit flex items-center gap-1 bg-purple-500/80 text-white border-0">
              <CheckCircle className="w-3 h-3" aria-hidden="true" />
              Verificado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {player.birth_date && <p className="text-sm text-white/80 drop-shadow">Edad: {age(player.birth_date)} años</p>}
          {player.created_at && (
            <p className="text-sm text-white/70 drop-shadow">Registrado: {new Date(player.created_at).toLocaleDateString('es-ES')}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onCredential} aria-label={`Credencial de ${player.name}`} className={glassOutlineButton}>
              <IdCard className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeactivate}
              aria-label={`Desactivar a ${player.name}`}
              className="backdrop-blur-md bg-red-500/30 border-red-300/50 text-red-300 hover:bg-red-500/40"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
