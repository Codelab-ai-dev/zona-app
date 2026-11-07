import { useState } from 'react'
import { toast } from 'sonner'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'

import { useDecideVerification, useDocumentUrl, usePlayerVerification, useUploadPlayerDocument } from '../verification-api'
import type { Player } from '../types'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback)

export function VerificationPlayerRow({ player, teamId }: { player: Player; teamId: string }) {
  const verification = usePlayerVerification(player.id)
  const upload = useUploadPlayerDocument(player.id)
  const decide = useDecideVerification(player.id, teamId)
  const documentUrl = useDocumentUrl()
  const [confirm, setConfirm] = useState<'verify' | 'unverify' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const data = verification.data
  const documentKey = data?.document_key
  const verified = data?.id_verified ?? false

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!ALLOWED.includes(file.type)) return setError('Formato no permitido. Usa JPEG, PNG, WEBP o PDF.')
    if (file.size > MAX_BYTES) return setError('El archivo supera los 10 MB.')
    try {
      await upload.mutateAsync(file)
      toast.success(`Documento de ${player.name} subido`)
    } catch (e) {
      setError(messageOf(e, 'No se pudo subir el documento'))
    }
  }

  const handleView = async () => {
    if (!documentKey) return
    setError(null)
    try {
      const { url } = await documentUrl.mutateAsync(documentKey)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(messageOf(e, 'No se pudo abrir el documento'))
    }
  }

  const handleConfirm = async () => {
    const action = confirm
    setConfirm(null)
    if (!action) return
    setError(null)
    try {
      await decide.mutateAsync(
        action === 'verify' ? { verified: true, document_key: documentKey } : { verified: false },
      )
      toast.success(action === 'verify' ? `${player.name} verificado` : `Verificación de ${player.name} retirada`)
    } catch (e) {
      setError(messageOf(e, 'No se pudo actualizar la verificación'))
    }
  }

  const badge = verification.isPending ? (
    <Badge variant="outline">Cargando…</Badge>
  ) : verification.isError ? (
    <Badge variant="destructive">Error</Badge>
  ) : verified ? (
    <Badge>Verificado</Badge>
  ) : documentKey ? (
    <Badge variant="outline">Pendiente de revisión</Badge>
  ) : (
    <Badge variant="secondary">Sin documento</Badge>
  )

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{player.name}</p>
        <p className="text-sm text-muted-foreground">Dorsal {player.jersey_number}</p>
      </TableCell>
      <TableCell>{badge}</TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          {verification.isError && (
            <Button size="sm" variant="outline" onClick={() => void verification.refetch()}>
              Reintentar
            </Button>
          )}
          {data && !documentKey && (
            <Input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="w-56"
              aria-label={`Subir documento de ${player.name}`}
              disabled={upload.isPending}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          )}
          {documentKey && (
            <Button size="sm" variant="outline" onClick={() => void handleView()} disabled={documentUrl.isPending} aria-label={`Ver documento de ${player.name}`}>
              Ver documento
            </Button>
          )}
          {documentKey && !verified && (
            <Button size="sm" onClick={() => setConfirm('verify')} disabled={decide.isPending} aria-label={`Marcar verificado a ${player.name}`}>
              Marcar verificado
            </Button>
          )}
          {verified && (
            <Button size="sm" variant="ghost" onClick={() => setConfirm('unverify')} disabled={decide.isPending} aria-label={`Quitar verificación a ${player.name}`}>
              Quitar verificación
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}

        <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm === 'verify' ? 'Marcar como verificado' : 'Quitar verificación'}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirm === 'verify'
                  ? `Confirma que revisaste el documento de ${player.name} y coincide con el jugador.`
                  : `${player.name} dejará de figurar como verificado.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirm()}>Confirmar</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}
