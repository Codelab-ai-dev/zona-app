import { useState } from 'react'
import { CheckCircle, Edit } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'

import type { LeaguePlayerVerification } from '../types'
import { useSaveBirthDate } from '../verification-api'

interface Props {
  row: LeaguePlayerVerification
  leagueId: string
  onClose: () => void
}

/** Edit the birth date; with a document on file it can verify the player in the same step. */
export function BirthDateDialog({ row, leagueId, onClose }: Props) {
  const [birthDate, setBirthDate] = useState(row.birth_date?.slice(0, 10) ?? '')
  const canVerify = Boolean(row.document_key) && row.status !== 'verified'
  const [verify, setVerify] = useState(canVerify)
  const [error, setError] = useState('')
  const save = useSaveBirthDate(leagueId)

  const submit = async () => {
    setError('')
    try {
      await save.mutateAsync({
        playerId: row.player_id,
        birthDate,
        verifyWith: canVerify && verify ? row.document_key : undefined,
      })
      toast.success(canVerify && verify ? 'Fecha de nacimiento actualizada y verificada' : 'Fecha de nacimiento actualizada')
      onClose()
    } catch (e) {
      const fieldMessage = e instanceof ApiError ? e.fields.birth_date : undefined
      setError(fieldMessage ?? (e instanceof Error ? e.message : 'No se pudo guardar'))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/10 bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Edit className="h-5 w-5 text-blue-400" aria-hidden="true" />
            Editar Fecha de Nacimiento
          </DialogTitle>
          <DialogDescription className="text-white/70">{row.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="birthDate" className="text-white">Fecha de Nacimiento</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'birthDate-error' : undefined}
              className="border-slate-600 bg-slate-800 text-white"
            />
            {error && (
              <p id="birthDate-error" role="alert" className="mt-1 text-xs text-red-400">
                {error}
              </p>
            )}
          </div>
          {canVerify && (
            <div className="flex items-center gap-2">
              <Checkbox id="verify-too" checked={verify} onCheckedChange={(v) => setVerify(v === true)} />
              <Label htmlFor="verify-too" className="text-white/90">Marcar como verificado (el documento ya fue revisado)</Label>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={onClose}>
              Cancelar
            </Button>
            <Button className="border-0 bg-green-500/80 text-white hover:bg-green-500/90" onClick={() => void submit()} disabled={!birthDate || save.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              {save.isPending ? 'Guardando…' : canVerify && verify ? 'Guardar y Verificar' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
