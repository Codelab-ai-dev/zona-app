import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/auth-context'

export function LoginPage() {
  const { status, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await signIn(String(form.get('email')), String(form.get('password')))
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>Iniciar sesión</h1>
          </CardTitle>
          <CardDescription>Acceso para administradores de liga y dueños de equipo.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Uncontrolled inputs keep the values if sign-in fails. */}
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required aria-describedby={error ? 'login-error' : undefined} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {error && (
              <p id="login-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
            <p className="text-center text-sm">
              <Link to="/recuperar-contrasena" className="underline underline-offset-4">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
