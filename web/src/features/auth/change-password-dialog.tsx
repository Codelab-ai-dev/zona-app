import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/auth-context'

import { passwordProblem } from './password-rules'

type Errors = { current?: string; next?: string; confirm?: string }

function Field({ id, label, error, autoComplete }: { id: string; label: string; error?: string; autoComplete: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type="password" autoComplete={autoComplete} required aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Header button + dialog. The server revokes every session on success, so we sign out. */
export function ChangePasswordDialog() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const change = useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) => api.post('/auth/password/change', body),
    onSuccess: async () => {
      toast.success('Contraseña actualizada. Inicia sesión de nuevo.')
      setOpen(false)
      await signOut()
      navigate('/login', { replace: true })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.isValidation) setErrors({ current: err.fields.current_password, next: err.fields.new_password })
      else setErrors({ current: err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña.' })
    },
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const current = String(form.get('current-password'))
    const next = String(form.get('new-password'))
    const confirm = String(form.get('confirm-password'))
    const found: Errors = {
      current: current ? undefined : 'Requerida',
      next: passwordProblem(next) ?? undefined,
      confirm: next !== confirm ? 'Las contraseñas no coinciden' : undefined,
    }
    setErrors(found)
    if (found.current || found.next || found.confirm) return
    change.mutate({ current_password: current, new_password: next })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setErrors({})
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Cambiar contraseña">
          <KeyRound className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Cambiar contraseña</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>Al guardar se cerrará tu sesión en todos los dispositivos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field id="current-password" label="Contraseña actual" error={errors.current} autoComplete="current-password" />
          <Field id="new-password" label="Nueva contraseña" error={errors.next} autoComplete="new-password" />
          <Field id="confirm-password" label="Confirmar nueva contraseña" error={errors.confirm} autoComplete="new-password" />
          <DialogFooter>
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
