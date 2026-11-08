import { Eye, EyeOff, ImageDown, Send, Trash, Trophy } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import type { MatchWithRelations } from '../types'
import { MatchCard } from './match-card'

interface RoundSectionProps {
  /** -1 groups matches without a round. */
  round: number
  matches: MatchWithRelations[]
  publishing: boolean
  onPoster: () => void
  /** Publishes the round, or hides it again when it is already published. */
  onPublish: (publish: boolean) => void
  onDeleteRound: () => void
  onEdit: (match: MatchWithRelations) => void
  onResult: (match: MatchWithRelations) => void
  onDelete: (match: MatchWithRelations) => void
  onQr: (match: MatchWithRelations) => void
  onAttendance: (match: MatchWithRelations) => void
  onReport: (match: MatchWithRelations) => void
}

/** One round: header with publish/poster actions plus its match rows. */
export function RoundSection({
  round,
  matches,
  publishing,
  onPoster,
  onPublish,
  onDeleteRound,
  onEdit,
  onResult,
  onDelete,
  onQr,
  onAttendance,
  onReport,
}: RoundSectionProps) {
  const isRoundPublished = matches.every((m) => m.is_published)
  return (
    <div
      className={`rounded-xl border bg-slate-800/50 ${isRoundPublished ? 'border-green-500/30' : 'border-white/10'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3 md:p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white md:text-base">
          <Trophy className="h-4 w-4 text-yellow-400 md:h-5 md:w-5" aria-hidden="true" />
          {round === -1 ? 'Partidos sin jornada' : `Jornada ${round}`}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs text-gray-400">{matches.length} partidos</span>
          {round !== -1 && (
            <>
              <Badge
                className={
                  isRoundPublished
                    ? 'border-green-500/30 bg-green-500/20 text-[10px] text-green-400'
                    : 'border-orange-500/30 bg-orange-500/20 text-[10px] text-orange-400'
                }
              >
                {isRoundPublished ? (
                  <Eye className="mr-1 h-3 w-3" aria-hidden="true" />
                ) : (
                  <EyeOff className="mr-1 h-3 w-3" aria-hidden="true" />
                )}
                {isRoundPublished ? 'Visible' : 'Sin publicar'}
              </Badge>
              <Button
                size="sm"
                onClick={onPoster}
                className="h-7 border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
              >
                <ImageDown className="mr-1 h-3 w-3" aria-hidden="true" />
                Póster de la jornada
              </Button>
              <Button
                size="sm"
                onClick={() => onPublish(!isRoundPublished)}
                disabled={publishing || matches.length === 0}
                className={
                  isRoundPublished
                    ? 'h-7 border border-orange-500/50 bg-transparent text-xs text-orange-400 hover:bg-orange-500/20'
                    : 'h-7 border-0 bg-green-500/80 text-xs text-white hover:bg-green-500'
                }
              >
                {isRoundPublished ? (
                  <>
                    <EyeOff className="mr-1 h-3 w-3" aria-hidden="true" />
                    Despublicar
                  </>
                ) : (
                  <>
                    <Send className="mr-1 h-3 w-3" aria-hidden="true" />
                    Publicar jornada
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={onDeleteRound}
                title="Eliminar jornada"
                className="h-7 border border-red-500/50 bg-transparent text-xs text-red-400 hover:bg-red-500/20"
              >
                <Trash className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">Eliminar jornada</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <ul className="divide-y divide-white/5">
        {matches.map((match) => (
          <li key={match.id}>
            <MatchCard
              match={match}
              onEdit={() => onEdit(match)}
              onResult={() => onResult(match)}
              onDelete={() => onDelete(match)}
              onQr={() => onQr(match)}
              onAttendance={() => onAttendance(match)}
              onReport={() => onReport(match)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
