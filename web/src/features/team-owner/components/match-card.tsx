import { Calendar, Clock, FileText } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { initials } from '../utils'
import type { Match } from '../types'

export type MatchResult = 'win' | 'loss' | 'draw' | null

export function matchResult(match: Match, teamId: string): MatchResult {
  if (match.status !== 'finished') return null
  const isHome = match.home_team_id === teamId
  const own = isHome ? match.home_score : match.away_score
  const other = isHome ? match.away_score : match.home_score
  return own > other ? 'win' : own < other ? 'loss' : 'draw'
}

function TeamSide({ name, own, side }: { name: string; own: boolean; side: 'Local' | 'Visitante' }) {
  const avatar = (
    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-white/20" aria-hidden="true">
      <AvatarFallback className="bg-slate-700 text-white text-xs">{initials(name)}</AvatarFallback>
    </Avatar>
  )
  const label = (
    <div className={cn('min-w-0', side === 'Visitante' && 'text-right')}>
      <p className={cn('font-semibold text-xs sm:text-sm truncate drop-shadow', own ? 'text-green-300' : 'text-white')}>{name}</p>
      <p className="text-[10px] sm:text-xs text-white/60">{side}</p>
    </div>
  )
  return (
    <div className={cn('flex-1 flex items-center gap-2 sm:gap-3', side === 'Visitante' && 'justify-end')}>
      {side === 'Local' ? (<>{avatar}{label}</>) : (<>{label}{avatar}</>)}
    </div>
  )
}

const scoreTone = (result: MatchResult) =>
  result === 'win' ? 'text-green-400' : result === 'loss' ? 'text-red-400' : 'text-yellow-400'

interface MatchCardProps {
  match: Match
  teamId: string
  homeName: string
  awayName: string
  onViewReport: (matchId: string) => void
}

/** One fixture of the Calendario tab; finished matches open the referee report. */
export function MatchCard({ match, teamId, homeName, awayName, onViewReport }: MatchCardProps) {
  const result = matchResult(match, teamId)
  const isFinished = match.status === 'finished'
  const homeOwn = match.home_team_id === teamId
  const awayOwn = match.away_team_id === teamId
  const date = new Date(match.match_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

  return (
    <div
      className={cn(
        'p-3 sm:p-4 backdrop-blur-md rounded-xl border shadow-lg transition-all',
        result === 'win' && 'bg-green-500/20 border-green-300/30',
        result === 'loss' && 'bg-red-500/20 border-red-300/30',
        result === 'draw' && 'bg-yellow-500/20 border-yellow-300/30',
        !isFinished && 'bg-white/10 border-white/20',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <TeamSide name={homeName} own={homeOwn} side="Local" />

        <div className="flex-shrink-0 text-center px-2 sm:px-4">
          {isFinished ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className={cn('text-lg sm:text-2xl font-bold', homeOwn ? scoreTone(result) : 'text-white')}>{match.home_score}</span>
              <span className="text-white/50 text-sm sm:text-lg">-</span>
              <span className={cn('text-lg sm:text-2xl font-bold', awayOwn ? scoreTone(result) : 'text-white')}>{match.away_score}</span>
            </div>
          ) : (
            <span className="text-white/60 text-sm sm:text-lg font-medium">VS</span>
          )}
          {isFinished && result && (
            <Badge
              className={cn(
                'mt-1 text-[10px] sm:text-xs',
                result === 'win' && 'bg-green-500/80',
                result === 'loss' && 'bg-red-500/80',
                result === 'draw' && 'bg-yellow-500/80',
              )}
            >
              {result === 'win' ? 'Victoria' : result === 'loss' ? 'Derrota' : 'Empate'}
            </Badge>
          )}
        </div>

        <TeamSide name={awayName} own={awayOwn} side="Visitante" />
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-white/70">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" aria-hidden="true" />
          <span>{date}</span>
        </div>
        {match.match_time && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>{match.match_time.slice(0, 5)}</span>
          </div>
        )}
        <Badge variant="outline" className="border-white/20 text-white/70 text-[10px]">
          {match.status === 'finished' ? 'Finalizado' : match.status === 'in_progress' ? 'En vivo' : match.status === 'cancelled' ? 'Cancelado' : 'Programado'}
        </Badge>
      </div>

      {isFinished && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewReport(match.id)}
            className="w-full text-white/70 hover:text-white hover:bg-white/10 text-xs h-8"
          >
            <FileText className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
            Cédula Arbitral
          </Button>
        </div>
      )}
    </div>
  )
}
