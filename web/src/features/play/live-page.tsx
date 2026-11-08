import { Eye } from 'lucide-react'
import { useParams } from 'react-router'

import { EmptyState, QueryState } from '@/components/states'
import MuxPlayer from '@mux/mux-player-react'

import { useStream } from './api'

export function LivePage() {
  const { streamId } = useParams<{ streamId: string }>()
  const stream = useStream(streamId || '')

  return (
    <section className="container mx-auto max-w-screen-2xl py-8 lg:py-10">
      <QueryState query={stream} loadingLabel="Cargando transmisión…">
        {(data) => {
          if (data.status !== 'live' && data.status !== 'ended') {
            return (
              <EmptyState
                title="Transmisión no disponible"
                description={`Estado: ${data.status === 'idle' ? 'Pendiente' : data.status === 'connecting' ? 'Conectando' : 'Finalizada'}`}
              />
            )
          }

          const playbackId = data.status === 'live' ? data.mux_playback_id : data.recording_playback_id

          if (!playbackId) {
            return <EmptyState title="Transmisión no disponible" description="No hay contenido disponible para reproducción." />
          }

          return (
            <div className="space-y-6">
              {/* Live Badge */}
              {data.status === 'live' && (
                <div className="flex items-center gap-2 text-red-600">
                  <span className="flex h-3 w-3 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />
                  <span className="font-bold uppercase tracking-wide">En Vivo</span>
                </div>
              )}

              {/* Video Player */}
              <div className="rounded-lg overflow-hidden bg-black aspect-video">
                <MuxPlayer
                  playbackId={playbackId}
                  metadata={{
                    video_title: data.title,
                  }}
                  streamType={data.status === 'live' ? 'live' : 'on-demand'}
                  style={{
                    width: '100%',
                    height: '100%',
                    aspectRatio: '16/9',
                  }}
                />
              </div>

              {/* Stream Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold">{data.title}</h1>
                  {data.description && <p className="text-muted-foreground">{data.description}</p>}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {data.status === 'live' && (
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Espectadores en vivo</p>
                      <p className="text-lg font-semibold flex items-center justify-center gap-1">
                        <Eye className="w-4 h-4" aria-hidden="true" />
                        {data.current_viewers}
                      </p>
                    </div>
                  )}
                  {data.actual_start && (
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Inició en</p>
                      <p className="text-sm font-semibold">
                        {new Date(data.actual_start).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                  {data.scheduled_start && (
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Programado</p>
                      <p className="text-sm font-semibold">
                        {new Date(data.scheduled_start).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }}
      </QueryState>
    </section>
  )
}
