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
  const leagues = useAdminLeagues({ limit: 100 })

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

    // League admins get their league when they are assigned to one
    if (form.role === 'team_owner' && !form.league_id) {
      setFormErrors({ league_id: 'requerido' })
      return
    }

    try {
      const { email, password, name, role, phone, league_id } = form
      await createUser.mutateAsync({ email, password, name, role, phone, league_id: role === 'team_owner' ? league_id : undefined } as CreateUserRequest)
      toast.success('Usuario creado exitosamente')
      onOpenChange(false)
      setForm({ role: 'league_admin' })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isValidation && Object.keys(err.fields).length > 0) {
          setFormErrors(err.fields)
        } else if (err.status === 409) {
          setFormErrors({ email: 'Este correo ya está registrado' })
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
      <DialogContent className="max-w-lg bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white text-base md:text-lg">Crear Usuario</DialogTitle>
          <DialogDescription className="text-gray-500 text-xs md:text-sm">Crea un nuevo usuario en el sistema</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="create-name" className="text-gray-400 text-sm">Nombre Completo *</Label>
            <Input className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
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
            <Label htmlFor="create-email" className="text-gray-400 text-sm">Email *</Label>
            <Input className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
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
            <Label htmlFor="create-password" className="text-gray-400 text-sm">Contraseña (mín. 10 caracteres) *</Label>
            <Input className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
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
            <Label htmlFor="create-confirm" className="text-gray-400 text-sm">Confirmar Contraseña *</Label>
            <Input className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
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
            <Label htmlFor="create-role" className="text-gray-400 text-sm">Rol *</Label>
            <Select value={form.role || ''} onValueChange={handleRoleChange}>
              <SelectTrigger id="create-role" className="bg-slate-700/50 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="league_admin" className="text-white hover:bg-slate-800">Administrador de Liga</SelectItem>
                <SelectItem value="team_owner" className="text-white hover:bg-slate-800">Propietario de Equipo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.role === 'team_owner' && (
            <div>
              <Label htmlFor="create-league" className="text-gray-400 text-sm">Liga *</Label>
              {/* /leagues/admin: super admins must see inactive leagues too */}
              <QueryState
                query={leagues}
                loadingLabel="Cargando ligas…"
                isEmpty={(res) => res.data.length === 0}
              >
                {(res) => (
                  <Select value={form.league_id || ''} onValueChange={(v) => setForm((prev) => ({ ...prev, league_id: v }))}>
                    <SelectTrigger
                      id="create-league"
                      className="bg-slate-700/50 border-white/10 text-white"
                      aria-invalid={!!formErrors.league_id}
                      aria-describedby={formErrors.league_id ? 'create-league-error' : undefined}
                    >
                      <SelectValue placeholder="Seleccionar Liga" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      {res.data.map((league) => (
                        <SelectItem key={league.id} value={league.id} className="text-white hover:bg-slate-800">
                          {league.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </QueryState>
              {formErrors.league_id && (
                <p id="create-league-error" className="text-xs text-destructive mt-1">{formErrors.league_id}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="create-phone" className="text-gray-400 text-sm">Teléfono</Label>
            <Input className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
              id="create-phone"
              value={form.phone || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+52 555 123 4567"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className="bg-slate-700/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700" onClick={() => onOpenChange(false)} disabled={createUser.isPending}>
              Cancelar
            </Button>
            <Button className="bg-green-500 hover:bg-green-600 text-white border-0" onClick={handleSubmit} disabled={createUser.isPending}>
              {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
