import { X, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/states'

/**
 * Search page. The backend does not provide a dedicated search endpoint.
 * This page demonstrates the limitation and shows that search would need
 * to be implemented via filtering on the /play/videos endpoint if those
 * parameters are available.
 *
 * Note: A dedicated search endpoint is missing. See report.
 */
export function SearchPage() {
  const [query, setQuery] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setHasSearched(true)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setHasSearched(false)
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-8">
      {/* Search Header */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Buscar</h1>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Buscar videos, clips, equipos…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-12 py-6 text-lg bg-muted border-0 focus-visible:ring-primary"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </form>
      </div>

      {/* No Search Yet */}
      {!hasSearched && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Sugerencias</h2>
          <EmptyState
            title="No hay búsqueda activa"
            description="Escribe en el cuadro de búsqueda para encontrar videos, clips y más."
            action={
              <Link to="/play">
                <Button variant="outline">Ver todos los videos</Button>
              </Link>
            }
          />
        </div>
      )}

      {/* Search Results with Limitation */}
      {hasSearched && (
        <div className="space-y-6">
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-foreground">
                <strong>Nota:</strong> La búsqueda avanzada no está disponible en esta versión. El backend no proporciona un endpoint de búsqueda dedicado.
                Para buscar videos, usa los filtros disponibles en la{' '}
                <Link to="/play" className="underline hover:text-primary">
                  lista de videos
                </Link>
                .
              </p>
            </CardContent>
          </Card>

          <EmptyState
            title="Búsqueda no disponible"
            description="El backend no incluye un endpoint de búsqueda. Consulta la lista completa de videos o clips."
            action={
              <div className="flex gap-2">
                <Link to="/play">
                  <Button variant="outline">Ver videos</Button>
                </Link>
                <Link to="/play/clips">
                  <Button variant="outline">Ver clips</Button>
                </Link>
              </div>
            }
          />
        </div>
      )}
    </div>
  )
}
