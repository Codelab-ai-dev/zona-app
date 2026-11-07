import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateLeagueAdmin, useAdminLeagues } from '../api'
import type { CreateUserRequest } from '../types'
import { ApiError } from '@/lib/api/client'
import { QueryState } from '@/components/states'

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const createUser = useCreateLeagueAdmin()
  const leagues = useAdminLeagues({ limit: 1000 })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<Partial<CreateUserRequest> & { confirmPassword?: string }>({
    role: 'league_admin',
  })

  const handleRoleChange = (role: string) => {
    setForm((prev) => ({ ...prev, role: role as 'league_admin' | 'team_owner' }))
  }

  const handleSubmit = async () => {
    setFormErrors({})

    if (!form.email || !form.password || !form.name) {
      setFormErrors({
        email: form.email ? '' : 'requerido',
        password: form.password ? '' : 'requerido',
        name: form.name ? '' : 'requerido',
      })
      return
    }

    if ((form.password?.length ?? 0) < 10) {
      setFormErrors({ password: 'mínimo 10 caracteres' })
      return
    }

    if (form.password !== form.confirmPassword) {
      setFormErrors({ confirmPassword: 'no coincide' })
      return
    }

    if (!form.league_id) {
      setFormErrors({ league_id: 'requerido' })
      return
    }

    try {
      const { email, password, name, role, phone, league_id } = form
      await createUser.mutateAsync({ email, password, name, role, phone, league_id } as CreateUserRequest)
      toast.success('Usuario creado exitosamente')
      onOpenChange(false)
      setForm({ role: 'league_admin' })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isValidation && err.fields) {
          setFormErrors(err.fields)
        } else if (err.status === 409) {
          setFormErrors({ email: 'ya existe' })
        } else {
          toast.error(err.message)
        }
      } else {
        toast.error('Error al crear el usuario')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Usuario</DialogTitle>
          <DialogDescription>Crea un nuevo usuario en el sistema</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="create-name">Nombre Completo *</Label>
            <Input
              id="create-name"
              value={form.name || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Juan Pérez"
              aria-invalid={!!formErrors.name}
              aria-describedby={formErrors.name ? 'create-name-error' : undefined}
            />
            {formErrors.name && (
              <p id="create-name-error" className="text-xs text-destructive mt-1">
                {formErrors.name}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="create-email">Email *</Label>
            <Input
              id="create-email"
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="juan@ejemplo.com"
              aria-invalid={!!formErrors.email}
              aria-describedby={formErrors.email ? 'create-email-error' : undefined}
            />
            {formErrors.email && (
              <p id="create-email-error" className="text-xs text-destructive mt-1">
                {formErrors.email}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="create-password">Contraseña (mín. 10 caracteres) *</Label>
            <Input
              id="create-password"
              type="password"
              value={form.password || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••••"
              aria-invalid={!!formErrors.password}
              aria-describedby={formErrors.password ? 'create-password-error' : undefined}
            />
            {formErrors.password && (
              <p id="create-password-error" className="text-xs text-destructive mt-1">
                {formErrors.password}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="create-confirm">Confirmar Contraseña *</Label>
            <Input
              id="create-confirm"
              type="password"
              value={form.confirmPassword || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="••••••••••"
              aria-invalid={!!formErrors.confirmPassword}
              aria-describedby={formErrors.confirmPassword ? 'create-confirm-error' : undefined}
            />
            {formErrors.confirmPassword && (
              <p id="create-confirm-error" className="text-xs text-destructive mt-1">
                {formErrors.confirmPassword}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="create-role">Rol *</Label>
            <Select value={form.role || ''} onValueChange={handleRoleChange}>
              <SelectTrigger id="create-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="league_admin">Administrador de Liga</SelectItem>
                <SelectItem value="team_owner">Propietario de Equipo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="create-league">Liga *</Label>
            <QueryState
              query={leagues}
              loadingLabel="Cargando ligas…"
              isEmpty={(res) => res.data.length === 0}
            >
              {(res) => (
                <Select value={form.league_id || ''} onValueChange={(v) => setForm((prev) => ({ ...prev, league_id: v }))}>
                  <SelectTrigger id="create-league">
                    <SelectValue placeholder="Seleccionar Liga" />
                  </SelectTrigger>
                  <SelectContent>
                    {res.data.map((league) => (
                      <SelectItem key={league.id} value={league.id}>
                        {league.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </QueryState>
            {formErrors.league_id && (
              <p className="text-xs text-destructive mt-1">{formErrors.league_id}</p>
            )}
          </div>

          <div>
            <Label htmlFor="create-phone">Teléfono</Label>
            <Input
              id="create-phone"
              value={form.phone || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+52 555 123 4567"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createUser.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createUser.isPending}>
              {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
