import { Target, Trophy, Users } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { initials } from '@/features/leagues/leagues-page'

import type { TeamPlayerStats } from '../types'

function Box({ label, value, tone = 'text-white', box = 'border-white/10 bg-slate-800/50', small = false }: { label: string; value: string | number; tone?: string; box?: string; small?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 text-center ${box}`}>
      <p className={`font-bold ${small ? 'text-sm md:text-base' : 'text-lg md:text-xl'} ${tone}`}>{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  )
}

const green = 'border-green-500/20 bg-green-500/10'
const blue = 'border-blue-500/20 bg-blue-500/10'

export function PlayerDetailDialog({ player, onClose }: { player: TeamPlayerStats | null; onClose: () => void }) {
  return (
    <Dialog open={player !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-white/10 bg-slate-900">
        {player && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white">
                <Avatar className="size-10 border-2 border-green-500/30 md:size-12">
                  {player.photo && <AvatarImage src={player.photo} alt="" />}
                  <AvatarFallback className="bg-green-500/20 text-green-400" aria-hidden="true">{initials(player.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base md:text-lg">{player.name}</span>
                    <Badge className="border-0 bg-green-500/20 text-green-400">#{player.jersey_number}</Badge>
                  </div>
                  <p className="text-xs font-normal text-gray-400 md:text-sm">{player.position || '-'}</p>
                </div>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">Estadísticas del jugador</DialogDescription>
            </DialogHeader>

            <div className="mt-3 space-y-4">
              <section className="rounded-lg border border-white/10 bg-slate-800/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Users className="size-4 text-green-400" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-white">Información</h3>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[10px] text-gray-500">Posición</dt>
                    <dd className="text-xs text-white">{player.position || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-gray-500">Número</dt>
                    <dd className="text-xs font-bold text-green-400">#{player.jersey_number}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Trophy className="size-4 text-yellow-400" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-white">Estadísticas</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Box label="PJ" value={player.matches_played} />
                  <Box label="Goles" value={player.goals} tone="text-green-400" box={green} />
                  <Box label="Asist." value={player.assists} tone="text-blue-400" box={blue} />
                  <Box label="TA" value={player.yellow_cards} tone="text-yellow-400" box="border-yellow-500/20 bg-yellow-500/10" />
                  <Box label="TR" value={player.red_cards} tone="text-red-400" box="border-red-500/20 bg-red-500/10" />
                  <Box label="Min" value={`${player.minutes_played}'`} />
                </div>
              </section>

              {player.matches_played > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <Target className="size-4 text-green-400" aria-hidden="true" />
                    <h3 className="text-sm font-medium text-white">Promedios</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Box small label="G/Partido" value={(player.goals / player.matches_played).toFixed(2)} tone="text-green-400" box={green} />
                    <Box small label="A/Partido" value={(player.assists / player.matches_played).toFixed(2)} tone="text-blue-400" box={blue} />
                    <Box small label="Min/Partido" value={`${Math.round(player.minutes_played / player.matches_played)}'`} />
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
