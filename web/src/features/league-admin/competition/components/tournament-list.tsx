import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, QueryState } from '@/components/states'

import { useTournaments } from '../api'
import type { Tournament } from '../types'
import { TournamentForm } from './tournament-form'

export function TournamentList({ leagueId }: { leagueId: string }) {
  const [showForm, setShowForm] = useState(false)
  const tournaments = useTournaments(leagueId)

  return (
    <section aria-labelledby="tournaments-title" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 id="tournaments-title" className="text-2xl font-bold">
            Torneos
          </h2>
          <p className="text-sm text-muted-foreground">Gestiona los torneos de la liga</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
          <Plus className="size-4" />
          Nuevo Torneo
        </Button>
      </header>

      {showForm && <TournamentForm leagueId={leagueId} onClose={() => setShowForm(false)} />}

      <QueryState
        query={tournaments}
        loadingLabel="Cargando torneos…"
        isEmpty={(res) => res.data.length === 0}
        empty={<EmptyState title="Sin torneos" description="Crea el primer torneo de la liga" />}
      >
        {(res) => (
          <ul className="grid gap-4">
            {res.data.map((tournament) => (
              <li key={tournament.id}>
                <TournamentCard tournament={tournament} leagueId={leagueId} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  )
}

function TournamentCard({ tournament, leagueId }: { tournament: Tournament; leagueId: string }) {
  const [showEdit, setShowEdit] = useState(false)

  return (
    <>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{tournament.name}</CardTitle>
            <CardDescription>
              {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                tournament.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {tournament.is_active ? 'Activo' : 'Inactivo'}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setShowEdit(true)}>
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <p>
              <span className="font-medium">Formato:</span> {tournament.tournament_format}
            </p>
            {tournament.registration_open && (
              <p className="text-blue-600">
                <span className="font-medium">Inscripciones abiertas</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {showEdit && (
        <TournamentForm
          leagueId={leagueId}
          tournament={tournament}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}
