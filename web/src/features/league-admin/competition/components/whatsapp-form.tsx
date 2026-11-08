import { AlertCircle } from 'lucide-react'
import { useState } from 'react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'

import { useCreateWhatsAppLink } from '../api'

interface WhatsAppFormProps {
  leagueId: string
  onClose: () => void
}

export function WhatsAppForm({ leagueId, onClose }: WhatsAppFormProps) {
  const [formData, setFormData] = useState({
    phone_number: '',
    role: 'team_owner',
    display_name: '',
    preferred_language: 'es',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const create = useCreateWhatsAppLink(leagueId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      await create.mutateAsync(formData)
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        // ApiError.fields is always an object; only use it when it has entries.
        if (Object.keys(err.fields).length > 0) {
          setErrors(err.fields)
        } else if (err.status === 409) {
          setErrors({ phone_number: 'Este número ya está registrado' })
        }
      }
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-lg bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg font-bold text-white">Nuevo Enlace de WhatsApp</DialogTitle>
          <DialogDescription className="text-gray-400 text-xs md:text-sm">
            Añade un número de teléfono para recibir notificaciones de la liga
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {create.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {create.error instanceof Error ? create.error.message : 'Error al guardar'}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-[10px] md:text-xs text-gray-400">Número de Teléfono</Label>
            <Input
              className="h-10 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
              id="phone"
              type="tel"
              placeholder="5215551234567"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              aria-invalid={!!errors.phone_number}
              aria-describedby={errors.phone_number ? 'phone-error' : undefined}
              disabled={create.isPending}
            />
            <p className="text-xs text-muted-foreground">Formato: 10-15 dígitos sin símbolos</p>
            {errors.phone_number && (
              <p id="phone-error" className="text-xs text-red-400">
                {errors.phone_number}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name" className="text-[10px] md:text-xs text-gray-400">Nombre (opcional)</Label>
            <Input
              className="h-10 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
              id="display_name"
              placeholder="Ej: Tesorería de la Liga"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              disabled={create.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-[10px] md:text-xs text-gray-400">Rol</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              disabled={create.isPending}
            >
              <SelectTrigger id="role" className="h-10 bg-slate-800/50 border-white/10 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                <SelectItem value="league_admin">Admin de Liga</SelectItem>
                <SelectItem value="team_owner">Dueño de Equipo</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="user">Usuario</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={create.isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white" disabled={create.isPending}>
              {create.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
