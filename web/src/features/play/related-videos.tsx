import { Eye, Video } from 'lucide-react'
import { Link } from 'react-router'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useRecordings } from './api'
import { formatDuration, videoScore, videoTitle } from './video-meta'

/** Five newest videos of the same league, excluding the one being watched. */
export function RelatedVideos({ leagueId, currentId }: { leagueId?: string; currentId: string }) {
  const related = useRecordings({ limit: 6, offset: 0 }, { leagueId })
  const videos = (related.data?.data ?? []).filter((v) => v.id !== currentId && v.status === 'ready').slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Videos Relacionados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!leagueId || (related.isSuccess && videos.length === 0) ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No hay videos relacionados</p>
        ) : related.isError ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No se pudieron cargar los videos relacionados.</p>
        ) : (
          <ul className="space-y-3">
            {videos.map((video) => (
              <li key={video.id}>
                <Link
                  to={`/play/watch/${video.id}`}
                  className="group flex gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="relative aspect-video w-32 flex-shrink-0 overflow-hidden rounded bg-muted">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="size-6 text-muted-foreground/50" aria-hidden="true" />
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-medium text-white">
                      {formatDuration(video.duration_seconds)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">{videoTitle(video)}</p>
                    {videoScore(video) && <p className="text-sm font-bold text-primary">{videoScore(video)}</p>}
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="size-3" aria-hidden="true" />
                      {(video.views_count || 0).toLocaleString()}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
