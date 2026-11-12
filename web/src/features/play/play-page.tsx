import { Eye, Video, Clock, Calendar, Play, ChevronRight, Tv } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorState, LoadingState } from '@/components/states'

import { useRecordings, useStreams } from './api'
import type { Recording, Stream } from './types'
import { formatDuration, LeagueBadge, videoScore, videoTitle } from './video-meta'

function VideoCard({ video }: { video: Recording }) {
  const title = videoTitle(video)
  const score = videoScore(video)

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
            <LeagueBadge video={video} className="absolute top-2 left-2" />
            {/* Duration badge */}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-xs text-white font-medium">
              {formatDuration(video.duration_seconds)}
            </div>
          </div>

          {/* Info */}
          <div className="p-4 space-y-1">
            <div className="font-semibold text-sm line-clamp-1">{title}</div>
            {title !== video.title && <div className="text-xs text-muted-foreground line-clamp-1">{video.title}</div>}
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

function LiveBanner({ stream }: { stream: Stream }) {
  if (stream.status !== 'live') return null

  return (
    <Link to={`/play/live/${stream.id}`} className="block">
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-600 to-pink-600 p-4 sm:p-6 mb-8 group hover:from-red-500 hover:to-pink-500 transition-all">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-white animate-pulse" aria-hidden="true" />
              <span className="text-white font-bold text-sm uppercase tracking-wide">En Vivo</span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-white/30" />
            <div className="text-white">
              <div className="text-sm opacity-80">{stream.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 text-white/80 text-sm">
              <Eye className="w-4 h-4" aria-hidden="true" />
              {stream.current_viewers || 0}
            </div>
            <Button size="sm" variant="secondary" className="group-hover:bg-white group-hover:text-red-600">
              <Tv className="w-4 h-4 mr-2" aria-hidden="true" />
              Ver ahora
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function PlayPage() {
  const recordings = useRecordings({ limit: 10, offset: 0 })
  const streams = useStreams({ limit: 5, offset: 0 })

  const liveStream = streams.data?.data.find((s) => s.status === 'live')
  const featuredVideo = recordings.data?.data[0]
  const recentVideos = recordings.data?.data.slice(1, 5) ?? []

  return (
    <section aria-labelledby="play-title" className="container mx-auto max-w-screen-2xl py-10 space-y-10">
      <h1 id="play-title" className="sr-only">
        Zona Play
      </h1>
      {recordings.isPending && <LoadingState />}

      {/* Live banner */}
      {liveStream && <LiveBanner stream={liveStream} />}

      {/* Featured video */}
      {featuredVideo && (
        <section aria-labelledby="featured-title" className="space-y-4">
          <h2 id="featured-title" className="sr-only">
            Video destacado
          </h2>
              <Link
                to={`/play/watch/${featuredVideo.id}`}
                className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="overflow-hidden bg-card hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-2 gap-0">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-muted">
                        {featuredVideo.thumbnail_url ? (
                          <img src={featuredVideo.thumbnail_url} alt={videoTitle(featuredVideo)} className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Video className="w-16 h-16 text-muted-foreground/50" aria-hidden="true" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                          <div className="w-20 h-20 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
                            <Play className="w-8 h-8 text-primary fill-current ml-1" aria-hidden="true" />
                          </div>
                        </div>
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-primary text-primary-foreground">Destacado</Badge>
                        </div>
                        <LeagueBadge video={featuredVideo} className="absolute top-4 right-4" />
                        <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded bg-black/80 text-sm text-white font-medium">
                          {formatDuration(featuredVideo.duration_seconds)}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-6 md:p-8 flex flex-col justify-center space-y-4">
                        <div className="space-y-2">
                          <h2 className="text-2xl md:text-3xl font-bold">{videoTitle(featuredVideo)}</h2>
                        </div>
                        {videoScore(featuredVideo) && (
                          <div className="text-4xl md:text-5xl font-bold text-primary">{videoScore(featuredVideo)}</div>
                        )}
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <Eye className="w-4 h-4" aria-hidden="true" />
                            {(featuredVideo.views_count || 0).toLocaleString()} vistas
                          </span>
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4" aria-hidden="true" />
                            {formatDuration(featuredVideo.duration_seconds)}
                          </span>
                          {featuredVideo.published_at && (
                            <span className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" aria-hidden="true" />
                              {new Date(featuredVideo.published_at).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
        </section>
      )}

      {/* Recent videos */}
      {recentVideos.length > 0 && (
        <section aria-labelledby="recent-title" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="recent-title" className="text-xl font-bold">
              Videos Recientes
            </h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
              <Link to="/play">
                Ver todos <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentVideos.map((video) => (
              <li key={video.id}>
                <VideoCard video={video} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {featuredVideo && (
        <section className="text-center py-12 space-y-4">
          <h2 className="text-2xl font-bold">Revive cada jugada de tu liga</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Accede a partidos completos, highlights y clips de las mejores jugadas del fútbol amateur
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button variant="outline" asChild>
              <Link to="/">Explorar ligas</Link>
            </Button>
          </div>
        </section>
      )}
      {recordings.isSuccess && !streams.isPending && recordings.data.data.length === 0 && !liveStream && (
        <div className="text-center py-20 space-y-4">
          <Video className="w-16 h-16 mx-auto text-muted-foreground/50" aria-hidden="true" />
          <h2 className="text-xl font-semibold">No hay videos todavía</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Pronto tendremos partidos, highlights y más contenido para ti.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/play/admin">Subir primer video</Link>
          </Button>
        </div>
      )}
      {recordings.isError && <ErrorState error={recordings.error} onRetry={() => void recordings.refetch()} />}
    </section>
  )
}
