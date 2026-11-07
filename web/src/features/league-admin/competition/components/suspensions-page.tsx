import { Plus } from 'lucide-react'
import { useState } from 'react'

import { EmptyState, QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'

import { useSuspensions } from '../api'
import type { Suspension } from '../types'
import { SuspensionCard } from './suspension-card'
import { SuspensionForm } from './suspension-form'

export function SuspensionsPage({ leagueId }: { leagueId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Suspension | null>(null)
  const suspensions = useSuspensions(leagueId)

  return (
    <section aria-labelledby="suspensions-title" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 id="suspensions-title" className="text-2xl font-bold">
            Suspensiones
          </h2>
          <p className="text-sm text-muted-foreground">Gestiona las suspensiones de jugadores</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
          <Plus className="size-4" aria-hidden="true" />
          Nueva Suspensión
        </Button>
      </header>

      {showForm && <SuspensionForm leagueId={leagueId} onClose={() => setShowForm(false)} />}
      {editing && <SuspensionForm leagueId={leagueId} suspension={editing} onClose={() => setEditing(null)} />}

      <QueryState
        query={suspensions}
        loadingLabel="Cargando suspensiones…"
        isEmpty={(res) => res.data.length === 0}
        empty={<EmptyState title="Sin suspensiones" description="No hay suspensiones registradas" />}
      >
        {(res) => (
          <ul className="grid gap-4">
            {res.data.map((suspension) => (
              <li key={suspension.id}>
                <SuspensionCard suspension={suspension} onEdit={() => setEditing(suspension)} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  )
}
