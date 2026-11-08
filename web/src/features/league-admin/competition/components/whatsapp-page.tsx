import { AlertCircle, CheckCircle, Clock, Megaphone, MessageSquare, Plus, Trash2, User, XCircle, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { ErrorState, LoadingState } from '@/components/states'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useDeleteWhatsAppLink, useTournaments, useWhatsAppLinks } from '../api'
import type { WhatsAppLink } from '../types'
import { BroadcastDialog } from './broadcast-dialog'
import { WhatsAppForm } from './whatsapp-form'

const glass = 'backdrop-blur-xl bg-white/10 border-white/20'
const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  league_admin: 'Admin Liga',
  team_owner: 'Dueño Equipo',
  user: 'Usuario',
}

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
                    <TableHead className="text-white/90 drop-shadow">Contacto</TableHead>
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
                    <WhatsAppRow key={link.id} link={link} tournamentName={tournaments.data?.data.find((t) => t.id === link.tournament_id)?.name} />
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

function WhatsAppRow({ link, tournamentName }: { link: WhatsAppLink; tournamentName?: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const deleteLink = useDeleteWhatsAppLink(link.id)
  const name = link.display_name || link.phone_number

  const handleDelete = async () => {
    try {
      await deleteLink.mutateAsync()
      setShowConfirm(false)
    } catch {
      // The mutation already shows the error toast; keep the dialog open.
    }
  }

  return (
    <>
      <TableRow className="border-white/20 hover:bg-white/5">
        <TableCell>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-white/50" aria-hidden="true" />
            <p className="text-white drop-shadow font-medium">{link.display_name || 'Sin nombre'}</p>
          </div>
        </TableCell>
        <TableCell>
          <code className="text-white/90 drop-shadow bg-white/10 px-2 py-1 rounded text-sm">+{link.phone_number}</code>
        </TableCell>
        <TableCell className="text-white/80 text-sm">{roleLabels[link.role] ?? link.role}</TableCell>
        <TableCell>
          {link.tournament_id ? (
            <Badge className="bg-blue-500/80 text-white">{tournamentName ?? 'Torneo'}</Badge>
          ) : (
            <Badge className="bg-orange-500/80 text-white">
              <AlertCircle className="w-3 h-3 mr-1" aria-hidden="true" />
              Sin torneo
            </Badge>
          )}
        </TableCell>
        <TableCell>
          {link.is_active ? (
            <Badge className="bg-green-500/80 text-white">
              <CheckCircle className="w-3 h-3 mr-1" aria-hidden="true" />
              Activo
            </Badge>
          ) : (
            <Badge className="bg-red-500/80 text-white">
              <XCircle className="w-3 h-3 mr-1" aria-hidden="true" />
              Inactivo
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-white/80 drop-shadow text-sm">
          {link.last_interaction_at ? new Date(link.last_interaction_at).toLocaleDateString('es-ES') : <span className="text-white/50">Sin interacciones</span>}
        </TableCell>
        <TableCell className="text-right">
          <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)} disabled={deleteLink.isPending} aria-label={`Eliminar enlace de ${name}`}>
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
        </TableCell>
      </TableRow>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar Enlace</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              ¿Estás seguro de que deseas eliminar este enlace de WhatsApp? Ya no recibirán notificaciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800/50 border-white/10 text-white hover:bg-slate-700 hover:text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLink.isPending} className="bg-red-500 hover:bg-red-600 text-white">
              {deleteLink.isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
