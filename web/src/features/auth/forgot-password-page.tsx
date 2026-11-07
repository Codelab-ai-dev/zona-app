import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api } from '@/lib/api/client'

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
    <div className="flex justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>Recuperar contraseña</h1>
          </CardTitle>
          <CardDescription>Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p role="status" className="text-sm">
              Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={error ? true : undefined} aria-describedby={error ? 'forgot-error' : undefined} />
              </div>
              {error && (
                <p id="forgot-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={forgot.isPending}>
                {forgot.isPending ? 'Enviando…' : 'Enviar enlace'}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm">
            <Link to="/login" className="underline underline-offset-4">
              Volver a iniciar sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
