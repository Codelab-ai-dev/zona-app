import { useMutation } from '@tanstack/react-query'
import { CheckCircle, Eye, EyeOff, Loader2, Lock, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/auth-context'

/** Same checks as the original, with the server's minimum length (10) instead of 8. */
export const passwordRequirements: { label: string; test: (password: string) => boolean }[] = [
  { label: 'Al menos 10 caracteres', test: (p) => Array.from(p).length >= 10 },
  { label: 'Al menos una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Al menos una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Al menos un número', test: (p) => /\d/.test(p) },
  { label: 'Al menos un carácter especial', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

const inputClass = 'pr-10 backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-lg'

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  const [shown, setShown] = useState(false)
  return (
    <div>
      <Label htmlFor={id} className="text-white/90 drop-shadow">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
        <Button
          type="button"
          size="sm"
          aria-label={shown ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-white"
          onClick={() => setShown(!shown)}
        >
          {shown ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  )
}

/**
 * Original inline "Cambiar Contraseña" form. The server revokes every session
 * on success, so the user is signed out and sent to the login.
 */
export function PasswordForm() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const change = useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) => api.post('/auth/password/change', body),
    onSuccess: async () => {
      toast.success('Contraseña cambiada exitosamente. Inicia sesión de nuevo.')
      setCurrent('')
      setNext('')
      setConfirm('')
      await signOut()
      navigate('/login', { replace: true })
    },
    onError: (err) => {
      const wrongCurrent = err instanceof ApiError && Boolean(err.fields.current_password)
      setMessage({
        type: 'error',
        text: wrongCurrent
          ? 'La contraseña actual es incorrecta'
          : `Error al cambiar contraseña: ${err instanceof Error ? err.message : 'Error desconocido'}`,
      })
    },
  })

  const passwordValid = passwordRequirements.every((r) => r.test(next))
  const canSubmit = Boolean(current && next && confirm) && next === confirm && passwordValid

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!current || !next || !confirm) return setMessage({ type: 'error', text: 'Todos los campos son requeridos' })
    if (next !== confirm) return setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' })
    if (!passwordValid) return setMessage({ type: 'error', text: 'La nueva contraseña no cumple con los requisitos de seguridad' })
    if (current === next) return setMessage({ type: 'error', text: 'La nueva contraseña debe ser diferente a la actual' })
    change.mutate({ current_password: current, new_password: next })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {message && (
        <Alert
          className={`backdrop-blur-xl shadow-xl ${message.type === 'success' ? 'border-green-300/30 bg-green-500/20' : 'border-red-300/30 bg-red-500/20'}`}
        >
          <AlertDescription className="text-white drop-shadow">{message.text}</AlertDescription>
        </Alert>
      )}
      <PasswordField id="current-password" label="Contraseña Actual" placeholder="Ingresa tu contraseña actual" value={current} onChange={setCurrent} autoComplete="current-password" />
      <div>
        <PasswordField id="new-password" label="Nueva Contraseña" placeholder="Ingresa tu nueva contraseña" value={next} onChange={setNext} autoComplete="new-password" />
        {next && (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium text-white/90 drop-shadow">Requisitos de contraseña:</p>
            {passwordRequirements.map((req) => {
              const passed = req.test(next)
              return (
                <div key={req.label} className="flex items-center text-sm">
                  {passed ? <CheckCircle className="w-4 h-4 text-green-300 mr-2" aria-hidden="true" /> : <X className="w-4 h-4 text-red-300 mr-2" aria-hidden="true" />}
                  <span className={passed ? 'text-green-300 drop-shadow' : 'text-red-300 drop-shadow'}>{req.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div>
        <PasswordField id="confirm-password" label="Confirmar Nueva Contraseña" placeholder="Confirma tu nueva contraseña" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {confirm && next !== confirm && <p className="text-sm text-red-300 mt-1 drop-shadow">Las contraseñas no coinciden</p>}
      </div>
      <Button
        type="submit"
        disabled={change.isPending || !canSubmit}
        className="w-full backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg"
      >
        {change.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            Cambiando Contraseña…
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
            Cambiar Contraseña
          </>
        )}
      </Button>
    </form>
  )
}
