import { useParams } from 'react-router'

import { EmptyState } from '@/components/states'

/**
 * Team videos page. This page shows videos filtered by team.
 * The API does not provide a team-specific endpoint, so the search
 * would need to be implemented via the general /play/videos endpoint
 * with filtering (if supported), or this could be populated from match data.
 *
 * For now, this is a stub page that shows the limitation.
 */
export function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>()

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Videos del equipo</h1>
        <p className="text-muted-foreground">Team ID: {teamId}</p>
      </header>

      <EmptyState
        title="Página en construcción"
        description="El filtrado de videos por equipo aún no está disponible. Consulta la lista de todos los videos o prueba la búsqueda."
      />
    </section>
  )
}
