"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/hooks/use-auth"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { ArrowLeft, Mail, Eye, EyeOff, Home } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState("")
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const { signIn, loading, error, isAuthenticated } = useAuth()
  const router = useRouter()

  // Verificar si Supabase está configurado correctamente
  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const supabase = createClientSupabaseClient()
        const { data, error } = await supabase.from('users').select('count').limit(1)

        if (error) {
          // console.error('Error de conexión a Supabase:', error)
          setLocalError('Error de conexión a la base de datos. Por favor, contacta al administrador.')
        } else {
          setSupabaseReady(true)
        }
      } catch (err) {
        // console.error('Error al inicializar Supabase:', err)
        setLocalError('Error al inicializar la autenticación. Por favor, contacta al administrador.')
      }
    }

    checkSupabase()
  }, [])

  // Redireccionar si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      // console.log('Usuario autenticado, redirigiendo a dashboard...')
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError("")

    if (!email || !password) {
      setLocalError("Por favor, ingresa tu correo y contraseña")
      return
    }

    if (!supabaseReady) {
      setLocalError("El sistema de autenticación no está listo. Por favor, intenta de nuevo en unos momentos.")
      return
    }

    try {
      // console.log('Intentando login con:', { email, password: '***' })
      const result = await signIn(email, password)
      // console.log('Login exitoso:', result)

      // Verificar si el usuario fue autenticado correctamente
      if (result?.user) {
        // console.log('Usuario autenticado, esperando redirección...')
        // La redirección se manejará en el useEffect cuando isAuthenticated cambie
      } else {
        // console.warn('Login completado pero no se recibió usuario')
        setLocalError("Autenticación incompleta. Por favor, intenta de nuevo.")
      }
    } catch (err: any) {
      // console.error('Login error:', err)

      // Mejorar los mensajes de error para el usuario
      if (err.message?.includes('Invalid login credentials')) {
        setLocalError("Credenciales inválidas. Por favor, verifica tu correo y contraseña.")
      } else if (err.message?.includes('network')) {
        setLocalError("Error de conexión. Por favor, verifica tu conexión a internet.")
      } else {
        setLocalError(err.message || "Error al iniciar sesión")
      }
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetMessage(null)

    if (!resetEmail) {
      setResetMessage({ type: 'error', text: 'Por favor, ingresa tu correo electrónico' })
      return
    }

    if (!supabaseReady) {
      setResetMessage({ type: 'error', text: 'El sistema no está listo. Por favor, intenta de nuevo.' })
      return
    }

    setResetLoading(true)

    try {
      const supabase = createClientSupabaseClient()

      // Usar generateLink para Supabase autoalojado
      const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://admin.zona-gol.com/reset-password',
      })

      if (error) {
        // Detectar si es un error de SMTP no configurado
        if (error.message.includes('SMTP') ||
          error.message.includes('mail') ||
          error.message.includes('email service')) {
          setResetMessage({
            type: 'error',
            text: 'El servidor de correo no está configurado. Por favor, contacta al administrador del sistema para que configure el servicio SMTP en Supabase.'
          })
        } else {
          setResetMessage({ type: 'error', text: `Error: ${error.message}` })
        }
      } else {
        setResetMessage({
          type: 'success',
          text: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada y la carpeta de spam.'
        })
        setResetEmail("")

        // Cerrar el diálogo después de 3 segundos
        setTimeout(() => {
          setIsResetDialogOpen(false)
          setResetMessage(null)
        }, 3000)
      }
    } catch (err: any) {
      // console.error('Password reset error:', err)

      // Mensajes de error más descriptivos
      if (err.message?.includes('SMTP') || err.message?.includes('mail')) {
        setResetMessage({
          type: 'error',
          text: 'El servidor de correo no está configurado correctamente. Contacta al administrador para configurar SMTP en Supabase.'
        })
      } else if (err.message?.includes('network')) {
        setResetMessage({
          type: 'error',
          text: 'Error de conexión. Verifica tu conexión a internet.'
        })
      } else {
        setResetMessage({
          type: 'error',
          text: err.message || 'Error al enviar correo de recuperación'
        })
      }
    } finally {
      setResetLoading(false)
    }
  }

  // Mostrar error local o del store
  const displayError = localError || error

  // Determinar si hay un problema de configuración
  const configError = !supabaseReady && !loading

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Background gradient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/3 h-screen bg-gradient-to-bl from-green-500/10 via-transparent to-transparent transform skew-x-12" />
        <div className="absolute bottom-0 left-0 w-1/4 h-screen bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent transform -skew-x-12" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-sm">
          {/* Home button */}
          <div className="mb-4">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 h-9 px-3"
              >
                <Home className="w-4 h-4 mr-2" />
                Inicio
              </Button>
            </Link>
          </div>

          {/* Login card */}
          <div className="rounded-2xl bg-slate-800/50 border border-white/10 p-6 md:p-8">
            {/* Logo and title */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <img src="/zona-gol.png" alt="Logo" className="w-20 h-20 md:w-24 md:h-24" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white mb-1">Panel de Administración</h1>
              <p className="text-gray-500 text-sm">Zona Gol</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-400 text-sm">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  disabled={loading}
                  className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-400 text-sm">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {displayError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-red-400 text-sm">{displayError}</p>
                </div>
              )}

              {configError && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                  <p className="text-yellow-400 text-sm">
                    Problema con la configuración. Contacta al administrador o visita{' '}
                    <a href="/debug-login" className="underline font-medium">depuración</a>.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 py-5 font-medium transition-all"
                disabled={loading || configError}
              >
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>

            {/* Forgot password */}
            <div className="mt-4 text-center">
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <button className="text-sm text-gray-500 hover:text-green-400 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-slate-900 border-white/10">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                      <Mail className="w-5 h-5 text-green-400" />
                      Recuperar Contraseña
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-gray-400 text-sm">Correo electrónico</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="tu@email.com"
                        required
                        disabled={resetLoading}
                        className="bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
                      />
                    </div>
                    {resetMessage && (
                      <div className={`rounded-lg p-3 ${
                        resetMessage.type === 'success'
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}>
                        <p className={`text-sm ${resetMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                          {resetMessage.text}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsResetDialogOpen(false)
                          setResetEmail("")
                          setResetMessage(null)
                        }}
                        className="flex-1 bg-slate-700/50 border-white/10 text-white hover:bg-slate-700"
                        disabled={resetLoading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        disabled={resetLoading || !resetEmail}
                      >
                        {resetLoading ? "Enviando..." : "Enviar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center relative z-10">
        <p className="text-gray-600 text-xs">© 2025 Zona Gol</p>
      </footer>
    </div>
  )
}