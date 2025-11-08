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
import { SimpleThemeToggle } from "@/components/ui/theme-toggle"
import { ArrowLeft, Mail } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
          console.error('Error de conexión a Supabase:', error)
          setLocalError('Error de conexión a la base de datos. Por favor, contacta al administrador.')
        } else {
          setSupabaseReady(true)
        }
      } catch (err) {
        console.error('Error al inicializar Supabase:', err)
        setLocalError('Error al inicializar la autenticación. Por favor, contacta al administrador.')
      }
    }
    
    checkSupabase()
  }, [])
  
  // Redireccionar si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Usuario autenticado, redirigiendo a dashboard...')
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
      console.log('Intentando login con:', { email, password: '***' })
      const result = await signIn(email, password)
      console.log('Login exitoso:', result)
      
      // Verificar si el usuario fue autenticado correctamente
      if (result?.user) {
        console.log('Usuario autenticado, esperando redirección...')
        // La redirección se manejará en el useEffect cuando isAuthenticated cambie
      } else {
        console.warn('Login completado pero no se recibió usuario')
        setLocalError("Autenticación incompleta. Por favor, intenta de nuevo.")
      }
    } catch (err: any) {
      console.error('Login error:', err)
      
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
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setResetMessage({ type: 'error', text: `Error: ${error.message}` })
      } else {
        setResetMessage({ 
          type: 'success', 
          text: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada.' 
        })
        setResetEmail("")
      }
    } catch (err: any) {
      console.error('Password reset error:', err)
      setResetMessage({ type: 'error', text: err.message || 'Error al enviar correo de recuperación' })
    } finally {
      setResetLoading(false)
    }
  }

  // Mostrar error local o del store
  const displayError = localError || error
  
  // Determinar si hay un problema de configuración
  const configError = !supabaseReady && !loading

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[url('/zona-fondo.png')] bg-cover bg-center p-4 overflow-hidden">
      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/70 dark:bg-black/80"></div>
      
      {/* Theme toggle button */}
      <div className="absolute top-4 right-4 z-20">
        <div className="backdrop-blur-md bg-white/10 rounded-lg p-1 border border-white/20">
          <SimpleThemeToggle />
        </div>
      </div>
      
      {/* Card con efecto glass */}
      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header con logo */}
          <div className="p-8 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/zona-gol.png" alt="Logo" className="w-32 h-32 drop-shadow-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-1">Panel de Administración</h2>
            <p className="text-white/70 text-sm drop-shadow">Zona-Gol</p>
          </div>
        
          {/* Formulario */}
          <div className="px-8 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white drop-shadow font-medium">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  disabled={loading}
                  className="backdrop-blur-md bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:border-green-400 focus:ring-green-400/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white drop-shadow font-medium">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="backdrop-blur-md bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:border-green-400 focus:ring-green-400/50 transition-all"
                />
              </div>
              {displayError && (
                <Alert className="backdrop-blur-md bg-red-500/20 border-red-300/30 shadow-lg">
                  <AlertDescription className="text-white drop-shadow">{displayError}</AlertDescription>
                </Alert>
              )}
              
              {configError && (
                <Alert className="backdrop-blur-md bg-yellow-500/20 border-yellow-300/30 shadow-lg">
                  <AlertDescription className="text-white drop-shadow">
                    Hay un problema con la configuración del sistema de autenticación.
                    Por favor, contacta al administrador o visita la página de <a href="/debug-login" className="underline font-semibold">depuración</a>.
                  </AlertDescription>
                </Alert>
              )}
              <Button 
                type="submit" 
                className="w-full backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 text-lg py-6 shadow-xl transition-all duration-300 hover:scale-[1.02]" 
                disabled={loading || configError}
              >
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>
            
            {/* Recuperar contraseña */}
            <div className="flex justify-center mt-4">
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all">
                    ¿Olvidaste tu contraseña?
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md backdrop-blur-xl bg-white/95 border-white/20">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Recuperar Contraseña
                    </DialogTitle>
                    <DialogDescription>
                      Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Correo electrónico</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="tu@email.com"
                        required
                        disabled={resetLoading}
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    {resetMessage && (
                      <Alert className={resetMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        <AlertDescription className={resetMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                          {resetMessage.text}
                        </AlertDescription>
                      </Alert>
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
                        className="flex-1"
                        disabled={resetLoading}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={resetLoading || !resetEmail}
                      >
                        {resetLoading ? "Enviando..." : "Enviar Enlace"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex justify-center border-t border-white/10 backdrop-blur-md bg-white/5 py-4">
            <Button asChild variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 transition-all">
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft size={16} />
                <span>Regresar al Inicio</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}