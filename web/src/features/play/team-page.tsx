import { Eye, Calendar, Play, Video } from 'lucide-react'
import { useParams } from 'react-router'

import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, QueryState } from '@/components/states'
import { Link } from 'react-router'

import { useRecordings } from './api'
import type { Recording } from './types'

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '--:--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function VideoCard({ video }: { video: Recording }) {
  const title = video.title
  const score = video.home_score !== null && video.away_score !== null ? `${video.home_score} - ${video.away_score}` : null

  return (
    <Link
      to={`/play/watch/${video.id}`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="overflow-hidden bg-card hover:border-primary/50 transition-all duration-300">
        <CardContent className="p-0">
          {/* Thumbnail */}
          <div className="relative aspect-video bg-muted">
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="w-12 h-12 text-muted-foreground/50" aria-hidden="true" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
                <Play className="w-6 h-6 text-primary fill-current ml-1" aria-hidden="true" />
              </div>
            </div>
            {/* Duration badge */}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-xs text-white font-medium">
              {formatDuration(video.duration_seconds)}
            </div>
          </div>

          {/* Info */}
          <div className="p-4 space-y-1">
            <div className="font-semibold text-sm line-clamp-1">{title}</div>
            {score && <div className="text-lg font-bold text-primary">{score}</div>}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" aria-hidden="true" />
                {(video.views_count || 0).toLocaleString()}
              </span>
              {video.published_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" aria-hidden="true" />
                  {new Date(video.published_at).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const recordings = useRecordings({ limit: 20, offset: 0 }, { teamId })

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Videos del equipo</h1>
        <p className="text-muted-foreground">Partidos y momentos destacados</p>
      </header>

      <QueryState
        query={recordings}
        isEmpty={(res) => res.data.length === 0}
        empty={
          <EmptyState
            title="No hay videos"
            description="Este equipo aún no tiene videos disponibles."
            action={
              <Link to="/play">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                  Ver todos los videos
                </button>
              </Link>
            }
          />
        }
        loadingLabel="Cargando videos del equipo…"
      >
        {(res) => (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {res.data.map((video) => (
              <li key={video.id}>
                <VideoCard video={video} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  )
}
