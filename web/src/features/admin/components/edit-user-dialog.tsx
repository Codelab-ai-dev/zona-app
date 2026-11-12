import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useUpdateUser } from '../api'
import type { User, UpdateUserRequest } from '../types'
import { ApiError } from '@/lib/api/client'

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const updateUser = useUpdateUser()

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  // Seeded once from the user: the parent mounts this with key={user.id}
  const [form, setForm] = useState<Partial<UpdateUserRequest>>(() => {
    if (user) {
      return {
        name: user.name,
        email: user.email,
        phone: user.phone,
        is_active: user.is_active,
      }
    }
    return {}
  })

  const handleSubmit = async () => {
    if (!user) return

    setFormErrors({})
    try {
      const { name, email, phone } = form
      await updateUser.mutateAsync({ id: user.id, data: { name, email, phone } })
      toast.success('Usuario actualizado exitosamente')
      onOpenChange(false)
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
        toast.error('Error al actualizar el usuario')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white text-base md:text-lg">Editar Usuario</DialogTitle>
          <DialogDescription className="text-gray-500 text-xs md:text-sm">Modifica la información del usuario</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name" className="text-gray-400 text-sm">Nombre Completo</Label>
            <Input className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
              id="edit-name"
              value={form.name || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              aria-invalid={!!formErrors.name}
              aria-describedby={formErrors.name ? 'edit-name-error' : undefined}
            />
            {formErrors.name && (
              <p id="edit-name-error" className="text-xs text-destructive mt-1">
                {formErrors.name}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-email" className="text-gray-400 text-sm">Email</Label>
            <Input className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
              id="edit-email"
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              aria-invalid={!!formErrors.email}
              aria-describedby={formErrors.email ? 'edit-email-error' : undefined}
            />
            {formErrors.email && (
              <p id="edit-email-error" className="text-xs text-destructive mt-1">
                {formErrors.email}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-phone" className="text-gray-400 text-sm">Teléfono</Label>
            <Input className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500"
              id="edit-phone"
              value={form.phone || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className="bg-slate-700/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700" onClick={() => onOpenChange(false)} disabled={updateUser.isPending}>
              Cancelar
            </Button>
            <Button className="bg-green-500 hover:bg-green-600 text-white border-0" onClick={handleSubmit} disabled={updateUser.isPending}>
              {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
