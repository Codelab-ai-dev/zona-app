import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api } from '@/lib/api/client'

import { AuthShell, authButtonClass, authErrorClass, authInputClass, authLabelClass, authLinkClass } from './auth-shell'

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const forgot = useMutation({
    mutationFn: (email: string) => api.post('/auth/password/forgot', { email }),
    onSuccess: () => setSent(true),
    onError: (err) => {
      // The API answers 204 for any address; only malformed input or rate limits fail.
      if (err instanceof ApiError && err.status === 429) setError('Demasiados intentos. Espera un minuto.')
      else if (err instanceof ApiError && err.isValidation) setError(err.fields.email ?? 'Correo no válido')
      else setError('No se pudo enviar la solicitud. Intenta de nuevo.')
    },
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    forgot.mutate(String(new FormData(e.currentTarget).get('email')).trim())
  }

  return (
    <AuthShell title="Recuperar contraseña">
      <h1 className="sr-only">Recuperar contraseña</h1>
      {sent ? (
        <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <p className="text-sm text-gray-400">Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.</p>
          <div className="space-y-2">
            <Label htmlFor="email" className={authLabelClass}>Correo electrónico</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="tu@email.com" required className={authInputClass} aria-invalid={error ? true : undefined} aria-describedby={error ? 'forgot-error' : undefined} />
          </div>
          {error && (
            <p id="forgot-error" role="alert" className={authErrorClass}>
              {error}
            </p>
          )}
          <Button type="submit" className={authButtonClass} disabled={forgot.isPending}>
            {forgot.isPending ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center">
        <Link to="/login" className={authLinkClass}>
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthShell>
  )
}
