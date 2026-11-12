import MuxPlayer from '@mux/mux-player-react'
import { AlertCircle, Calendar, ChevronLeft, Clock, Eye, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'

import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ApiError } from '@/lib/api/client'

import { useRecording } from './api'
import { RelatedVideos } from './related-videos'
import type { Recording } from './types'
import { formatDuration, TeamLinks, videoScore, videoTitle } from './video-meta'

function PlayerPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted p-4">
      <div className="space-y-4 text-center">{children}</div>
    </div>
  )
}

function Player({ video, title }: { video: Recording; title: string }) {
  if (video.status === 'ready' && video.mux_playback_id) {
    return (
      <MuxPlayer
        playbackId={video.mux_playback_id}
        poster={video.thumbnail_url}
        metadata={{ video_title: title }}
        streamType="on-demand"
        style={{ width: '100%', height: '100%', aspectRatio: '16/9' }}
      />
    )
  }
  if (video.status === 'failed') {
    return (
      <PlayerPlaceholder>
        <AlertCircle className="mx-auto size-12 text-destructive" aria-hidden="true" />
        <div role="alert">
          <p className="font-medium text-destructive">Error al procesar</p>
          <p className="text-sm text-muted-foreground">{video.error_message || 'No se pudo procesar el video'}</p>
        </div>
      </PlayerPlaceholder>
    )
  }
  if (video.status === 'pending' || video.status === 'uploading' || video.status === 'processing') {
    const label = video.status === 'processing' ? 'Procesando video' : video.status === 'uploading' ? 'Subiendo video' : 'Video pendiente'
    return (
      <PlayerPlaceholder>
        <Loader2 className="mx-auto size-12 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <div role="status">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">Estará disponible en unos minutos…</p>
        </div>
        {video.processing_progress > 0 && (
          <div className="mx-auto w-48 space-y-1">
            <Progress value={video.processing_progress} aria-label="Progreso del video" />
            <p className="text-xs text-muted-foreground">{video.processing_progress}%</p>
          </div>
        )}
      </PlayerPlaceholder>
    )
  }
  return (
    <PlayerPlaceholder>
      <p className="text-muted-foreground">El video aún no está disponible para reproducción.</p>
    </PlayerPlaceholder>
  )
}

function WatchContent({ video }: { video: Recording }) {
  const title = videoTitle(video)
  const score = videoScore(video)
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <Player video={video} title={title} />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {video.league && (
                <Badge variant="outline" className="border-primary/50 text-primary">
                  {video.league.name}
                </Badge>
              )}
              {title !== video.title && <span className="text-sm text-muted-foreground">{video.title}</span>}
            </div>
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
          {score && (
            <div className="text-4xl font-bold text-primary" aria-label={`Marcador ${score}`}>
              {score}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 py-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Eye className="size-4" aria-hidden="true" />
            {(video.views_count || 0).toLocaleString()} vistas
          </span>
          {video.published_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" aria-hidden="true" />
              {new Date(video.published_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden="true" />
            {formatDuration(video.duration_seconds)}
          </span>
        </div>
        <Separator />
        <TeamLinks video={video} />
        {video.description && (
          <div className="space-y-2">
            <h2 className="font-semibold">Descripción</h2>
            <p className="text-muted-foreground">{video.description}</p>
          </div>
        )}
      </div>

      <aside aria-label="Videos relacionados" className="space-y-4">
        <RelatedVideos leagueId={video.league_id} currentId={video.id} />
      </aside>
    </div>
  )
}

export function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const recording = useRecording(videoId || '')

  return (
    <section className="container mx-auto max-w-screen-2xl py-8 lg:py-10">
      <Link to="/play" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Volver
      </Link>
      {recording.isPending ? (
        <LoadingState label="Cargando video…" />
      ) : recording.isError ? (
        recording.error instanceof ApiError && recording.error.isNotFound ? (
          <EmptyState title="Video no disponible" description="Este video no existe, es privado o todavía no está listo." />
        ) : (
          <ErrorState error={recording.error} onRetry={() => void recording.refetch()} />
        )
      ) : (
        <WatchContent video={recording.data} />
      )}
    </section>
  )
}
