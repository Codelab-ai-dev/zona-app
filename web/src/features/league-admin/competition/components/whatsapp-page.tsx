import { Plus, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, QueryState } from '@/components/states'
import { Badge } from '@/components/ui/badge'

import { useWhatsAppLinks, useDeleteWhatsAppLink } from '../api'
import type { WhatsAppLink } from '../types'
import { WhatsAppForm } from './whatsapp-form'

export function WhatsAppPage({ leagueId }: { leagueId: string }) {
  const [showForm, setShowForm] = useState(false)
  const links = useWhatsAppLinks(leagueId)

  return (
    <section aria-labelledby="whatsapp-title" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 id="whatsapp-title" className="text-2xl font-bold">
            Enlaces de WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground">Gestiona los números de teléfono para notificaciones</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
          <Plus className="size-4" />
          Nuevo Enlace
        </Button>
      </header>

      {showForm && <WhatsAppForm leagueId={leagueId} onClose={() => setShowForm(false)} />}

      <QueryState
        query={links}
        loadingLabel="Cargando enlaces…"
        isEmpty={(res) => res.data.length === 0}
        empty={<EmptyState title="Sin enlaces" description="Añade números de teléfono para notificaciones" />}
      >
        {(res) => (
          <ul className="grid gap-4">
            {res.data.map((link) => (
              <li key={link.id}>
                <WhatsAppLinkCard link={link} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  )
}

function WhatsAppLinkCard({ link }: { link: WhatsAppLink }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const deleteLink = useDeleteWhatsAppLink(link.id)

  const handleDelete = async () => {
    try {
      await deleteLink.mutateAsync()
      setShowConfirm(false)
    } catch {
      // Error is already handled by mutation toast
    }
  }

  return (
    <>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">{link.display_name || link.phone_number}</CardTitle>
            <p className="text-sm text-muted-foreground">+{link.phone_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={link.is_active ? 'default' : 'secondary'}>
              {link.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirm(true)}
              disabled={deleteLink.isPending}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Rol: {link.role}</p>
          {link.last_interaction_at && (
            <p>Última interacción: {new Date(link.last_interaction_at).toLocaleDateString()}</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Enlace</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este enlace de WhatsApp? Ya no recibirán notificaciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLink.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLink.isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
