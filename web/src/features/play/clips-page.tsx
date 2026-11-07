import { Eye, Heart, Play } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, QueryState } from '@/components/states'

import { useClips } from './api'
import type { Clip } from './types'

const clipTypeLabels: Record<string, string> = {
  goal: 'Gol',
  save: 'Atajada',
  highlight: 'Highlight',
  yellow_card: 'Tarjeta amarilla',
  red_card: 'Tarjeta roja',
  penalty: 'Penal',
  custom: 'Personalizado',
  ai_generated: 'IA generado',
}

const clipTypeColors = {
  goal: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
  save: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  highlight: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  penalty: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
} as const

function ClipCard({ clip }: { clip: Clip }) {
  const colorKey = (clip.clip_type && clip.clip_type in clipTypeColors) ? (clip.clip_type as keyof typeof clipTypeColors) : 'highlight'
  const colors = clipTypeColors[colorKey]
  const typeLabel = clip.clip_type ? (clipTypeLabels[clip.clip_type] ?? 'Clip') : 'Clip'

  return (
    <Link to={`/play/watch/${clip.id}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      <Card className="overflow-hidden bg-card hover:border-primary/50 transition-all duration-300 h-full">
        <CardContent className="p-0">
          {/* Thumbnail - Vertical aspect ratio for clips */}
          <div className="relative aspect-[9/16] bg-muted">
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-transparent to-black/60">
              <div className="w-14 h-14 rounded-full bg-background/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-accent fill-current ml-0.5" aria-hidden="true" />
              </div>
            </div>

            {/* Duration */}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-xs text-white font-medium">
              {formatClipDuration(clip.duration_seconds)}
            </div>

            {/* Type Badge */}
            <div className="absolute top-2 left-2">
              <Badge className={`text-xs ${colors.bg} ${colors.text} border ${colors.border}`}>{typeLabel}</Badge>
            </div>

            {/* Views overlay */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white/90 text-xs">
              <Eye className="w-3 h-3" aria-hidden="true" />
              {formatCount(clip.views_count)}
            </div>
          </div>

          {/* Info */}
          <div className="p-3 space-y-2">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-accent transition-colors">{clip.title}</h3>
            {clip.description && <p className="text-xs text-muted-foreground line-clamp-1">{clip.description}</p>}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatClipDuration(clip.duration_seconds)}</span>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" aria-hidden="true" />
                {formatCount(clip.likes_count)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function formatClipDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

export function ClipsPage() {
  const clips = useClips({ limit: 24, offset: 0 })

  return (
    <section aria-labelledby="clips-title" className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 space-y-1">
        <h1 id="clips-title" className="text-2xl font-bold tracking-tight">
          Clips
        </h1>
        <p className="text-muted-foreground">Las mejores jugadas del fútbol amateur</p>
      </header>

      <QueryState
        query={clips}
        isEmpty={(res) => res.data.length === 0}
        empty={<EmptyState title="Aún no hay clips" description="Los clips que se publiquen aparecerán aquí." />}
        loadingLabel="Cargando clips…"
      >
        {(res) => (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {res.data.map((clip) => (
              <li key={clip.id}>
                <ClipCard clip={clip} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  )
}
