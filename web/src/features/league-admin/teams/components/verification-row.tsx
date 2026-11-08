import { useState } from 'react'
import { CheckCircle, CreditCard, Edit, Eye, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'

import type { LeaguePlayerVerification } from '../types'
import { useDecideVerification, useUploadPlayerDocument } from '../verification-api'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const ghost = 'border-white/30 bg-white/10 text-white hover:bg-white/20'

const initials = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback)

export interface RowAge {
  age: number
  ok: boolean | null
}

interface Props {
  row: LeaguePlayerVerification
  leagueId: string
  age: RowAge | null
  onView: (row: LeaguePlayerVerification) => void
  onEditBirthDate: (row: LeaguePlayerVerification) => void
}

function StatusBadge({ status }: { status: LeaguePlayerVerification['status'] }) {
  if (status === 'verified')
    return <Badge className="flex w-fit items-center gap-1 border-0 bg-green-500/80 text-white"><CheckCircle className="h-3 w-3" aria-hidden="true" />Verificado</Badge>
  if (status === 'pending')
    return <Badge className="flex w-fit items-center gap-1 border-0 bg-yellow-500/80 text-white"><CreditCard className="h-3 w-3" aria-hidden="true" />Pendiente</Badge>
  return <Badge className="w-fit border-0 bg-gray-500/80 text-white">Sin INE</Badge>
}

export function VerificationRow({ row, leagueId, age, onView, onEditBirthDate }: Props) {
  const upload = useUploadPlayerDocument(leagueId)
  const decide = useDecideVerification(leagueId)
  const [confirm, setConfirm] = useState<'verify' | 'unverify' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!ALLOWED.includes(file.type)) return setError('Formato no permitido. Usa JPEG, PNG, WEBP o PDF.')
    if (file.size > MAX_BYTES) return setError('El archivo supera los 10 MB.')
    try {
      await upload.mutateAsync({ playerId: row.player_id, file })
      toast.success(`Documento de ${row.name} subido`)
    } catch (e) {
      setError(messageOf(e, 'No se pudo subir el documento'))
    }
  }

  const handleConfirm = async () => {
    const action = confirm
    setConfirm(null)
    if (!action) return
    setError(null)
    try {
      const body = action === 'verify' ? { verified: true, document_key: row.document_key } : { verified: false }
      await decide.mutateAsync({ playerId: row.player_id, body })
      toast.success(action === 'verify' ? `${row.name} verificado` : `Verificación de ${row.name} retirada`)
    } catch (e) {
      setError(messageOf(e, 'No se pudo actualizar la verificación'))
    }
  }

  return (
    <TableRow className="border-white/10 hover:bg-white/5">
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-white/20">
            <AvatarFallback className="bg-slate-700 text-xs text-white">{initials(row.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-white">{row.name}</p>
            <p className="text-xs text-white/60">Dorsal {row.jersey_number} · {row.position}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-white/80">{row.team_name}</TableCell>
      <TableCell>
        {age ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm text-white">{age.age} años</span>
            {age.ok !== null && (
              <Badge className={`w-fit border-0 text-white ${age.ok ? 'bg-green-500/80' : 'bg-red-500/80'}`}>
                {age.ok ? 'Cumple edad' : 'No cumple edad'}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-white/50">-</span>
        )}
      </TableCell>
      <TableCell><StatusBadge status={row.status} /></TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!row.document_key && (
            <Input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="w-56 border-white/10 bg-slate-800/50 text-white"
              aria-label={`Subir documento de ${row.name}`}
              disabled={upload.isPending}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          )}
          {row.document_key && (
            <Button size="sm" variant="outline" className={ghost} onClick={() => onView(row)} aria-label={`Ver documento de ${row.name}`}>
              <Eye className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          <Button size="sm" variant="outline" className={ghost} onClick={() => onEditBirthDate(row)} aria-label={`Editar fecha de nacimiento de ${row.name}`}>
            <Edit className="h-4 w-4" aria-hidden="true" />
          </Button>
          {row.status === 'pending' && (
            <Button size="sm" className="border-0 bg-green-500/80 text-white hover:bg-green-500/90" onClick={() => setConfirm('verify')} disabled={decide.isPending} aria-label={`Marcar verificado a ${row.name}`}>
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          {row.status === 'verified' && (
            <Button size="sm" className="border-0 bg-red-500/80 text-white hover:bg-red-500/90" onClick={() => setConfirm('unverify')} disabled={decide.isPending} aria-label={`Quitar verificación a ${row.name}`}>
              <XCircle className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        {error && <p role="alert" className="mt-1 text-right text-xs text-red-400">{error}</p>}

        <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
          <AlertDialogContent className="border-white/10 bg-slate-900 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm === 'verify' ? 'Marcar como verificado' : 'Quitar verificación'}</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                {confirm === 'verify'
                  ? `Confirma que revisaste el documento de ${row.name} y coincide con el jugador.`
                  : `${row.name} dejará de figurar como verificado.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel className="border-white/10 bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 hover:text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirm()}>Confirmar</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}
