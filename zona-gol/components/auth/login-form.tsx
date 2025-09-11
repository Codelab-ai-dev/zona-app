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
    <div className="min-h-screen flex items-center justify-center bg-[url('/zona-fondo.png')] bg-cover bg-center p-0 relative">
      <div className="absolute inset-0 bg-black/70 dark:bg-black/80"></div>
      
      {/* Theme toggle button */}
      <div className="absolute top-4 right-4 z-20">
        <SimpleThemeToggle />
      </div>
      
      <Card className="w-full max-w-md overflow-hidden border-0 shadow-2xl rounded-lg relative z-10">
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-3">
              <img src="/zona-gol-final.webp" alt="Logo" className="w-48 h-48" />
            </div>
            <p className="text-foreground text-center">Panel de Administración</p>
          </div>
        
        <CardContent className="pt-6 pb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                disabled={loading}
                className="border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            {displayError && (
              <Alert variant="destructive">
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            )}
            
            {configError && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800">
                  Hay un problema con la configuración del sistema de autenticación.
                  Por favor, contacta al administrador o visita la página de <a href="/debug-login" className="underline font-medium">depuración</a>.
                </AlertDescription>
              </Alert>
            )}
            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6" 
              disabled={loading || configError}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
          
          <div className="flex justify-center mt-4">
            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="text-sm text-gray-600 hover:text-green-600">
                  ¿Olvidaste tu contraseña?
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
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
        </CardContent>
        
        <CardFooter className="flex justify-center border-t pt-4 pb-6">
          <Button asChild variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              <span>Regresar al Inicio</span>
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}