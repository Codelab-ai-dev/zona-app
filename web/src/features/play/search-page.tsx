import { X, Search, Eye, Calendar, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, QueryState } from '@/components/states'

import { useRecordings } from './api'
import type { Recording } from './types'
import { LeagueBadge, videoScore, videoTitle } from './video-meta'

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

function SearchResultCard({ video }: { video: Recording }) {
  const title = videoTitle(video)
  const score = videoScore(video)
  return (
    <Link
      to={`/play/watch/${video.id}`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="overflow-hidden bg-card hover:border-primary/50 transition-all duration-300">
        <CardContent className="p-0">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted flex-shrink-0 w-48">
              {video.thumbnail_url ? (
                <img src={video.thumbnail_url} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-8 h-8 text-muted-foreground/50" aria-hidden="true" />
                </div>
              )}
              <LeagueBadge video={video} className="absolute top-2 left-2" />
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-xs text-white font-medium">
                {formatDuration(video.duration_seconds)}
              </div>
            </div>

            {/* Info */}
            <div className="p-4 flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary">{title}</h3>
              {score && <p className="text-base font-bold text-primary">{score}</p>}
              {video.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{video.description}</p>}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
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
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const recordings = useRecordings({ limit: 20, offset: 0 }, { q: debouncedQuery })

  const clearSearch = () => {
    setQuery('')
    setDebouncedQuery('')
  }

  return (
    <section className="container mx-auto max-w-screen-xl py-10 space-y-8">
      {/* Search Header */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Buscar</h1>

        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="search-input" className="sr-only">
            Buscar videos
          </Label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <Input
              id="search-input"
              type="text"
              placeholder="Buscar videos por título o descripción…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 pr-12 py-6 text-lg bg-muted border-0 focus-visible:ring-primary"
              aria-label="Buscar videos"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* No Search Yet */}
      {!debouncedQuery && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Sugerencias</h2>
          <EmptyState
            title="No hay búsqueda activa"
            description="Escribe en el cuadro de búsqueda para encontrar videos por título o descripción."
            action={
              <Button variant="outline" asChild>
                <Link to="/play">Ver todos los videos</Link>
              </Button>
            }
          />
        </div>
      )}

      {/* Search Results */}
      {debouncedQuery && (
        <QueryState
          query={recordings}
          isEmpty={(res) => res.data.length === 0}
          empty={
            <EmptyState
              title="No hay resultados"
              description={`No encontramos videos que coincidan con "${debouncedQuery}"`}
              action={
                <Button variant="outline" onClick={clearSearch}>
                  Buscar de nuevo
                </Button>
              }
            />
          }
          loadingLabel="Buscando videos…"
        >
          {(res) => (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {res.data.length} resultado{res.data.length !== 1 ? 's' : ''}
              </p>
              <ul className="space-y-3">
                {res.data.map((video) => (
                  <li key={video.id}>
                    <SearchResultCard video={video} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </QueryState>
      )}
    </section>
  )
}
