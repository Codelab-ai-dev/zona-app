import { useMutation } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api } from '@/lib/api/client'

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
  return (
    <div className="flex justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>Nueva contraseña</h1>
          </CardTitle>
          <CardDescription>Entre 10 y 72 caracteres.</CardDescription>
        </CardHeader>
        <CardContent>
          {(missing || errors.token) && (
            <p role="alert" className="mb-4 text-sm text-destructive">
              El enlace no es válido o ya venció.{' '}
              <Link to="/recuperar-contrasena" className="underline underline-offset-4">
                Solicita uno nuevo
              </Link>
            </p>
          )}
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input id="new-password" name="new-password" type="password" autoComplete="new-password" required aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? 'new-password-error' : undefined} />
              {errors.password && (
                <p id="new-password-error" className="text-sm text-destructive">
                  {errors.password}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required aria-invalid={errors.confirm ? true : undefined} aria-describedby={errors.confirm ? 'confirm-password-error' : undefined} />
              {errors.confirm && (
                <p id="confirm-password-error" className="text-sm text-destructive">
                  {errors.confirm}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={reset.isPending || missing}>
              {reset.isPending ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
