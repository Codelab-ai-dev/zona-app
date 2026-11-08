import { Ban, Loader2, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTeamsByLeague } from '@/features/league-admin/teams/api'

import { useSuspensions } from '../api'
import type { Suspension } from '../types'
import { SuspensionForm } from './suspension-form'
import { SuspensionRow } from './suspension-card'

const newButton = 'backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg'

export function SuspensionsPage({ leagueId }: { leagueId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Suspension | null>(null)
  const suspensions = useSuspensions(leagueId)
  const teams = useTeamsByLeague(leagueId)
  const teamNames = useMemo(() => new Map((teams.data?.data ?? []).map((t) => [t.id, t.name])), [teams.data])

  return (
    <section aria-labelledby="suspensions-title" className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle id="suspensions-title" className="flex items-center gap-2 text-white drop-shadow-lg">
                <Ban className="w-5 h-5 text-red-300" aria-hidden="true" />
                Gestión de Suspensiones
              </CardTitle>
              <CardDescription className="text-white/80 drop-shadow">
                Administra las suspensiones de jugadores por tarjetas o decisiones disciplinarias
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} className={newButton}>
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Nueva Suspensión
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {suspensions.isPending ? (
            <div role="status" className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-3 text-white" aria-hidden="true" />
              <span className="text-white drop-shadow">Cargando suspensiones...</span>
            </div>
          ) : suspensions.isError ? (
            <ErrorState error={suspensions.error} onRetry={() => void suspensions.refetch()} />
          ) : suspensions.data.data.length === 0 ? (
            <div className="text-center py-12">
              <Ban className="w-12 h-12 mx-auto text-white/50 mb-4" aria-hidden="true" />
              <h3 className="text-base sm:text-lg font-medium text-white drop-shadow-lg mb-2">No hay suspensiones registradas</h3>
              <p className="text-white/80 drop-shadow mb-4">No se han registrado suspensiones en esta liga.</p>
              <Button onClick={() => setShowForm(true)} className={newButton}>
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                Crear Primera Suspensión
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-white/20 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-white/5">
                    <TableHead className="text-white/90">Jugador</TableHead>
                    <TableHead className="text-white/90">Equipo</TableHead>
                    <TableHead className="text-white/90">Tipo</TableHead>
                    <TableHead className="text-white/90">Motivo</TableHead>
                    <TableHead className="text-center text-white/90">Partidos</TableHead>
                    <TableHead className="text-white/90">Estado</TableHead>
                    <TableHead className="text-right text-white/90">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspensions.data.data.map((suspension) => (
                    <SuspensionRow
                      key={suspension.id}
                      suspension={suspension}
                      teamName={teamNames.get(suspension.team_id)}
                      onEdit={() => setEditing(suspension)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && <SuspensionForm leagueId={leagueId} onClose={() => setShowForm(false)} />}
      {editing && <SuspensionForm leagueId={leagueId} suspension={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}
