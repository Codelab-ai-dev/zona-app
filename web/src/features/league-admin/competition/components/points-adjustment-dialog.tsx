import { useState } from 'react'

import { AlertCircle, Edit } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import { useAdjustPoints } from '../api'
import type { Standings } from '../types'

interface PointsAdjustmentDialogProps {
  standing: Standings
  tournamentId: string
  onClose: () => void
}

export function PointsAdjustmentDialog({
  standing,
  tournamentId,
  onClose,
}: PointsAdjustmentDialogProps) {
  const [points, setPoints] = useState('0')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const adjust = useAdjustPoints()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!/^-?\d+$/.test(points.trim())) {
      setErrors({ points: 'Debe ser un número entero válido' })
      return
    }
    const pointsValue = Number(points.trim())
    if (pointsValue === 0) {
      setErrors({ points: 'El ajuste no puede ser 0' })
      return
    }

    if (!reason.trim()) {
      setErrors({ reason: 'El motivo es obligatorio' })
      return
    }

    try {
      await adjust.mutateAsync({
        team_id: standing.team_id,
        tournament_id: tournamentId,
        points_adjustment: pointsValue,
        adjustment_reason: reason.trim(),
      })
      onClose()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) {
        setErrors(err.fields)
      } else if (err instanceof Error) {
        setErrors({ points: err.message })
      }
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-md bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center text-white text-sm md:text-base">
            <Edit className="w-4 h-4 mr-2" aria-hidden="true" />
            Ajustar Puntos
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs md:text-sm">{standing.team_name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {adjust.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {adjust.error instanceof Error ? adjust.error.message : 'Error al ajustar'}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="current" className="text-gray-400 text-[10px] md:text-xs">Puntos Actuales</Label>
            <Input
              id="current"
              type="number"
              value={standing.points}
              disabled
              className="h-8 md:h-9 bg-slate-800/50 border-white/10 text-white text-center text-xs md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment" className="text-gray-400 text-[10px] md:text-xs">Ajuste de Puntos</Label>
            <Input
              id="adjustment"
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Ej: 3 o -3"
              className="h-8 md:h-9 bg-slate-800/50 border-white/10 text-white text-center text-xs md:text-sm"
              aria-invalid={!!errors.points}
              aria-describedby={errors.points ? 'points-error' : undefined}
              disabled={adjust.isPending}
            />
            {errors.points && (
              <p id="points-error" className="text-xs text-red-400">
                {errors.points}
              </p>
            )}
            <p className="text-[10px] text-gray-500 mt-1">
              Nuevo total: {standing.points + (parseInt(points, 10) || 0)} puntos
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-gray-400 text-[10px] md:text-xs">Motivo</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explica el motivo del ajuste…"
              className="bg-slate-800/50 border-white/10 text-white text-xs md:text-sm min-h-[60px]"
              aria-invalid={!!errors.reason}
              aria-describedby={errors.reason ? 'reason-error' : undefined}
              disabled={adjust.isPending}
              rows={3}
            />
            {errors.reason && (
              <p id="reason-error" className="text-xs text-red-400">
                {errors.reason}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={adjust.isPending} className="text-gray-400 hover:text-white hover:bg-slate-800/50">
              Cancelar
            </Button>
            <Button type="submit" disabled={adjust.isPending} className="bg-green-500 hover:bg-green-600 text-white">
              {adjust.isPending ? 'Guardando…' : 'Ajustar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
