import { Share2, Heart } from 'lucide-react'
import { useParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { QueryState } from '@/components/states'
import MuxPlayer from '@mux/mux-player-react'

import { useRecording } from './api'

export function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const recording = useRecording(videoId || '')

  return (
    <section className="container mx-auto max-w-screen-2xl py-8 lg:py-10">
      <QueryState query={recording} loadingLabel="Cargando video…">
        {(data) => {
          if (!data.mux_playback_id) {
            return (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
                <p className="text-foreground">El video aún no está disponible para reproducción.</p>
              </div>
            )
          }

          return (
            <div className="space-y-6">
              {/* Video Player */}
              <div className="rounded-lg overflow-hidden bg-black aspect-video">
                <MuxPlayer
                  playbackId={data.mux_playback_id}
                  metadata={{
                    video_title: data.title,
                  }}
                  streamType="on-demand"
                  style={{
                    width: '100%',
                    height: '100%',
                    aspectRatio: '16/9',
                  }}
                />
              </div>

              {/* Video Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold">{data.title}</h1>
                  {data.description && <p className="text-muted-foreground">{data.description}</p>}
                </div>

                {/* Score and Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {data.home_score != null && data.away_score != null && (
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Marcador</p>
                      <p className="text-2xl font-bold text-primary">{data.home_score} - {data.away_score}</p>
                    </div>
                  )}
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Vistas</p>
                    <p className="text-lg font-semibold">{(data.views_count || 0).toLocaleString()}</p>
                  </div>
                  {data.duration_seconds && (
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Duración</p>
                      <p className="text-lg font-semibold">{formatDuration(data.duration_seconds)}</p>
                    </div>
                  )}
                  {data.published_at && (
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Publicado</p>
                      <p className="text-lg font-semibold">
                        {new Date(data.published_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    <Heart className="w-4 h-4 mr-2" aria-hidden="true" />
                    Me gusta ({data.likes_count || 0})
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" aria-hidden="true" />
                    Compartir
                  </Button>
                </div>
              </div>
            </div>
          )
        }}
      </QueryState>
    </section>
  )
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}
