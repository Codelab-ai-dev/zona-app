import { AlertCircle, CheckCircle, Clock, Megaphone, MessageSquare, Plus, XCircle, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { ErrorState, LoadingState } from '@/components/states'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useLeagueUsers, useTournaments, useWhatsAppLinks } from '../api'
import { BroadcastDialog } from './broadcast-dialog'
import { WhatsAppForm } from './whatsapp-form'
import { WhatsAppRow } from './whatsapp-row'

const glass = 'backdrop-blur-xl bg-white/10 border-white/20'
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: LucideIcon; color: string }) {
  return (
    <Card className={glass}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70 drop-shadow">{label}</p>
            <p className={`text-3xl font-bold drop-shadow-lg ${color}`}>{value}</p>
          </div>
          <Icon className={`w-8 h-8 ${color}`} aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  )
}

export function WhatsAppPage({ leagueId }: { leagueId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const links = useWhatsAppLinks(leagueId)
  const tournaments = useTournaments(leagueId)
  const users = useLeagueUsers(leagueId)
  const rows = links.data?.data ?? []

  return (
    <section aria-labelledby="whatsapp-title" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Vínculos" value={rows.length} icon={MessageSquare} color="text-blue-300" />
        <StatCard label="Activos" value={rows.filter((l) => l.is_active).length} icon={CheckCircle} color="text-green-300" />
        <StatCard label="Inactivos" value={rows.filter((l) => !l.is_active).length} icon={XCircle} color="text-red-300" />
        <StatCard label="Con Interacciones" value={rows.filter((l) => l.last_interaction_at).length} icon={Clock} color="text-yellow-300" />
      </div>

      <Card className={glass}>
        <CardHeader>
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle id="whatsapp-title" className="flex items-center gap-2 text-white drop-shadow-lg">
                <MessageSquare className="w-5 h-5 text-green-400" aria-hidden="true" />
                Gestión de WhatsApp
              </CardTitle>
              <CardDescription className="text-white/80 drop-shadow">Vincula números de WhatsApp con usuarios de tu liga</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => setShowBroadcast(true)} className="backdrop-blur-md bg-white/10 border border-white/30 text-white hover:bg-white/20">
                <Megaphone className="w-4 h-4 mr-2" aria-hidden="true" />
                Enviar jornada
              </Button>
              <Button onClick={() => setShowForm(true)} className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0">
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                Nuevo Vínculo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.some((l) => !l.tournament_id && l.is_active) && (
            <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-orange-300/90">
                  <strong className="text-orange-300">Atención:</strong> Hay vínculos sin torneo asignado. El agente no podrá responder consultas de tabla, resultados o calendario sin un torneo configurado.
                </p>
              </div>
            </div>
          )}

          {links.isPending ? (
            <LoadingState label="Cargando vínculos..." />
          ) : links.isError ? (
            <ErrorState error={links.error} onRetry={() => void links.refetch()} />
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-white/30 mx-auto mb-4" aria-hidden="true" />
              <p className="text-white/80 drop-shadow mb-2">No hay vínculos de WhatsApp</p>
              <p className="text-white/60 drop-shadow text-sm">Crea el primer vínculo para empezar a usar el Agent Service</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-white/5">
                    <TableHead className="text-white/90 drop-shadow">Usuario</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Teléfono</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Rol</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Torneo</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Estado</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Última Interacción</TableHead>
                    <TableHead className="text-white/90 drop-shadow text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((link) => (
                    <WhatsAppRow
                      key={link.id}
                      leagueId={leagueId}
                      link={link}
                      tournamentName={tournaments.data?.data.find((t) => t.id === link.tournament_id)?.name}
                      account={users.data?.data.find((u) => u.id === link.user_id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showBroadcast && <BroadcastDialog leagueId={leagueId} onClose={() => setShowBroadcast(false)} />}
      {showForm && <WhatsAppForm leagueId={leagueId} onClose={() => setShowForm(false)} />}
    </section>
  )
}
