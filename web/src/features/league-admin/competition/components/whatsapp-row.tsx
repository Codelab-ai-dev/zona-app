import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle, CheckCircle, Pencil, Power, Trash2, User, XCircle } from 'lucide-react'
import { useState } from 'react'

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
import { TableCell, TableRow } from '@/components/ui/table'

import { useDeleteWhatsAppLink, useUpdateWhatsAppLink, type LeagueUser } from '../api'
import type { WhatsAppLink } from '../types'
import { WhatsAppForm } from './whatsapp-form'

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  league_admin: 'Admin Liga',
  team_owner: 'Dueño Equipo',
  user: 'Usuario',
}

/** One link of the WhatsApp table: contact, phone, role, tournament, state and the edit / toggle / delete actions. */
export function WhatsAppRow({ leagueId, link, tournamentName, account }: { leagueId: string; link: WhatsAppLink; tournamentName?: string; account?: LeagueUser }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const deleteLink = useDeleteWhatsAppLink(link.id)
  const toggle = useUpdateWhatsAppLink(link.id)
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
            <div>
              <p className="text-white drop-shadow font-medium">{link.display_name || account?.name || 'Sin nombre'}</p>
              <p className="text-white/60 drop-shadow text-sm">{account?.email || 'Sin email'}</p>
            </div>
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
          {link.last_interaction_at ? formatDistanceToNow(new Date(link.last_interaction_at), { addSuffix: true, locale: es }) : <span className="text-white/50">Sin interacciones</span>}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              aria-label={`Editar vínculo de ${name}`}
              className="backdrop-blur-md bg-blue-500/20 border-blue-300/30 text-white hover:bg-blue-500/30"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggle.mutate({ is_active: !link.is_active })}
              disabled={toggle.isPending}
              aria-label={`${link.is_active ? 'Desactivar' : 'Activar'} vínculo de ${name}`}
              className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Power className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)} disabled={deleteLink.isPending} aria-label={`Eliminar vínculo de ${name}`}>
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {editing && <WhatsAppForm leagueId={leagueId} link={link} onClose={() => setEditing(false)} />}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar Vínculo</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              ¿Estás seguro de eliminar este vínculo? Esta acción no se puede deshacer.
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
