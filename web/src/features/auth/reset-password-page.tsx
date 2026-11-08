import { useMutation } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api } from '@/lib/api/client'

import { AuthShell, authButtonClass, authErrorClass, authInputClass, authLabelClass } from './auth-shell'
import { passwordProblem } from './password-rules'

/** Keeps the reset token out of Referer headers while the page is mounted. */
function useNoReferrer() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'referrer'
    meta.content = 'no-referrer'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}

export function ResetPasswordPage() {
  useNoReferrer()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Read once, then strip it from the URL bar and history.
  const [token] = useState(() => params.get('token') ?? '')
  useEffect(() => {
    if (window.location.search.includes('token')) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])

  const [errors, setErrors] = useState<{ password?: string; confirm?: string; token?: string }>({})
  const reset = useMutation({
    mutationFn: (password: string) => api.post('/auth/password/reset', { token, password }),
    onSuccess: () => {
      toast.success('Contraseña actualizada. Inicia sesión con la nueva.')
      navigate('/login', { replace: true })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.isValidation) {
        setErrors({
          token: err.fields.token ? 'El enlace no es válido o ya venció.' : undefined,
          password: err.fields.password,
        })
      } else {
        setErrors({ password: err instanceof ApiError ? err.message : 'No se pudo actualizar la contraseña.' })
      }
    },
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const password = String(form.get('new-password'))
    const confirm = String(form.get('confirm-password'))
    const next = { password: passwordProblem(password) ?? undefined, confirm: password !== confirm ? 'Las contraseñas no coinciden' : undefined }
    setErrors(next)
    if (next.password || next.confirm) return
    reset.mutate(password)
  }

  const missing = !token
  const fieldError = 'text-sm text-red-400'
  return (
    <AuthShell title="Nueva contraseña">
      <h1 className="sr-only">Nueva contraseña</h1>
      <p className="mb-5 text-sm text-gray-400">Entre 10 y 72 caracteres.</p>
      {(missing || errors.token) && (
        <p role="alert" className={`${authErrorClass} mb-5`}>
          El enlace no es válido o ya venció.{' '}
          <Link to="/recuperar-contrasena" className="underline underline-offset-4">
            Solicita uno nuevo
          </Link>
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="new-password" className={authLabelClass}>Nueva contraseña</Label>
          <Input id="new-password" name="new-password" type="password" autoComplete="new-password" required className={authInputClass} aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? 'new-password-error' : undefined} />
          {errors.password && (
            <p id="new-password-error" className={fieldError}>
              {errors.password}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password" className={authLabelClass}>Confirmar contraseña</Label>
          <Input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required className={authInputClass} aria-invalid={errors.confirm ? true : undefined} aria-describedby={errors.confirm ? 'confirm-password-error' : undefined} />
          {errors.confirm && (
            <p id="confirm-password-error" className={fieldError}>
              {errors.confirm}
            </p>
          )}
        </div>
        <Button type="submit" className={authButtonClass} disabled={reset.isPending || missing}>
          {reset.isPending ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </AuthShell>
  )
}
