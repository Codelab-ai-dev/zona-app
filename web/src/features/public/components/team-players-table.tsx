import { useState } from 'react'
import { Users } from 'lucide-react'

import { QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/features/leagues/leagues-page'

import { useTeamPlayerStats } from '../api'
import type { TeamPlayerStats } from '../types'
import { PlayerDetailDialog } from './player-detail-dialog'

const th = 'pb-2 text-xs font-medium text-gray-500 md:pb-3'
const num = 'py-2 text-center text-xs md:py-3 md:text-sm'

export function TeamPlayersTable({ teamId }: { teamId: string }) {
  const stats = useTeamPlayerStats(teamId)
  const [selected, setSelected] = useState<TeamPlayerStats | null>(null)

  return (
    <>
      <QueryState
        query={stats}
        loadingLabel="Cargando jugadores…"
        isEmpty={(res) => res.data.length === 0}
        empty={
          <div className="py-6 text-center">
            <Users className="mx-auto mb-3 size-10 text-gray-600" aria-hidden="true" />
            <p className="text-sm text-gray-400">Aún no hay jugadores registrados.</p>
          </div>
        }
      >
        {(res) => (
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Plantilla de jugadores">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th scope="col" className={`${th} w-12 text-center`}>#</th>
                  <th scope="col" className={th}>Jugador</th>
                  <th scope="col" className={`${th} hidden sm:table-cell`}>Posición</th>
                  <th scope="col" className={`${th} text-center`}>PJ</th>
                  <th scope="col" className={`${th} text-center`}>Goles</th>
                  <th scope="col" className={`${th} text-center`}>Asist.</th>
                  <th scope="col" className={`${th} text-center`}>TA</th>
                  <th scope="col" className={`${th} text-center`}>TR</th>
                  <th scope="col" className={`${th} hidden text-center md:table-cell`}>Min.</th>
                </tr>
              </thead>
              <tbody>
                {res.data.map((p) => (
                  <tr key={p.player_id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="py-2 text-center text-sm font-semibold text-green-400 md:py-3">{p.jersey_number || '-'}</td>
                    <td className="py-2 md:py-3">
                      <button type="button" onClick={() => setSelected(p)} aria-label={`Ver estadísticas de ${p.name}`} className="flex w-full items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 md:gap-3">
                        <Avatar className="size-7 border border-green-500/30 md:size-8">
                          {p.photo && <AvatarImage src={p.photo} alt="" />}
                          <AvatarFallback className="bg-green-500/20 text-[10px] text-green-400 md:text-xs" aria-hidden="true">{initials(p.name)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-xs font-medium text-white md:text-sm">{p.name}</span>
                      </button>
                    </td>
                    <td className="hidden py-2 text-xs text-gray-500 sm:table-cell md:py-3 md:text-sm">{p.position || '-'}</td>
                    <td className={`${num} text-gray-300`}>{p.matches_played}</td>
                    <td className={`${num} font-semibold text-green-400`}>{p.goals}</td>
                    <td className={`${num} text-blue-400`}>{p.assists}</td>
                    <td className={`${num} text-yellow-400`}>{p.yellow_cards}</td>
                    <td className={`${num} text-red-400`}>{p.red_cards}</td>
                    <td className={`${num} hidden text-gray-400 md:table-cell`}>{p.minutes_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
      <PlayerDetailDialog player={selected} onClose={() => setSelected(null)} />
    </>
  )
}
