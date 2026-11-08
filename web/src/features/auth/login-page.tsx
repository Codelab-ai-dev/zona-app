import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/auth-context'

import { AuthShell, authButtonClass, authErrorClass, authInputClass, authLabelClass, authLinkClass } from './auth-shell'

export function LoginPage() {
  const { status, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [show, setShow] = useState(false)

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
    <AuthShell>
      <h1 className="sr-only">Iniciar sesión</h1>
      {/* Uncontrolled inputs keep the values if sign-in fails. */}
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email" className={authLabelClass}>Correo electrónico</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="tu@email.com" required disabled={submitting} className={authInputClass} aria-describedby={error ? 'login-error' : undefined} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className={authLabelClass}>Contraseña</Label>
          <div className="relative">
            <Input id="password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" required disabled={submitting} className={`${authInputClass} pr-12`} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-emerald-400">
              {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
        {error && (
          <p id="login-error" role="alert" className={`${authErrorClass} flex items-center gap-2`}>
            <span className="size-1.5 shrink-0 rounded-full bg-red-400" aria-hidden="true" />
            {error}
          </p>
        )}
        <div className="pt-2">
          <Button type="submit" className={`${authButtonClass} group`} disabled={submitting}>
            <span className="flex items-center justify-center gap-3">
              <span className="tracking-wide uppercase">{submitting ? 'Entrando…' : 'Entrar'}</span>
              {!submitting && <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />}
            </span>
          </Button>
        </div>
      </form>
      <p className="mt-6 text-center">
        <Link to="/recuperar-contrasena" className={authLinkClass}>
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </AuthShell>
  )
}
