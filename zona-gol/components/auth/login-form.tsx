"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Mail, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react"

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
  const [mounted, setMounted] = useState(false)
  const [showExpiredMessage, setShowExpiredMessage] = useState(false)
  const { signIn, loading, error, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if session expired
  useEffect(() => {
    const expired = searchParams.get('expired')
    if (expired === 'true') {
      setShowExpiredMessage(true)
      // Remove the expired param from URL after showing message
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('expired')
      window.history.replaceState({}, '', newUrl.pathname)
    }
  }, [searchParams])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const supabase = createClientSupabaseClient()
        const { data, error } = await supabase.from('users').select('count').limit(1)
        if (error) {
          setLocalError('Error de conexión a la base de datos.')
        } else {
          setSupabaseReady(true)
        }
      } catch (err) {
        setLocalError('Error al inicializar la autenticación.')
      }
    }
    checkSupabase()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
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
      setLocalError("El sistema no está listo. Intenta de nuevo.")
      return
    }

    try {
      const result = await signIn(email, password)
      if (!result?.user) {
        setLocalError("Autenticación incompleta. Intenta de nuevo.")
      }
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials')) {
        setLocalError("Credenciales inválidas. Verifica tu correo y contraseña.")
      } else if (err.message?.includes('network')) {
        setLocalError("Error de conexión. Verifica tu internet.")
      } else {
        setLocalError(err.message || "Error al iniciar sesión")
      }
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetMessage(null)

    if (!resetEmail) {
      setResetMessage({ type: 'error', text: 'Ingresa tu correo electrónico' })
      return
    }

    setResetLoading(true)

    try {
      const supabase = createClientSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://admin.zona-gol.com/reset-password',
      })

      if (error) {
        if (error.message.includes('SMTP') || error.message.includes('mail')) {
          setResetMessage({
            type: 'error',
            text: 'Servidor de correo no configurado. Contacta al administrador.'
          })
        } else {
          setResetMessage({ type: 'error', text: error.message })
        }
      } else {
        setResetMessage({
          type: 'success',
          text: 'Correo enviado. Revisa tu bandeja de entrada.'
        })
        setResetEmail("")
        setTimeout(() => {
          setIsResetDialogOpen(false)
          setResetMessage(null)
        }, 3000)
      }
    } catch (err: any) {
      setResetMessage({
        type: 'error',
        text: err.message || 'Error al enviar correo'
      })
    } finally {
      setResetLoading(false)
    }
  }

  const displayError = localError || error
  const configError = !supabaseReady && !loading

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stadium light beams */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse-slower" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[80px] animate-pulse-slow" />

        {/* Field lines decoration */}
        <svg className="absolute bottom-0 left-0 w-full h-64 opacity-[0.02]" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice">
          <circle cx="600" cy="350" r="120" fill="none" stroke="white" strokeWidth="3"/>
          <line x1="0" y1="200" x2="1200" y2="200" stroke="white" strokeWidth="3"/>
          <path d="M 500 350 A 150 150 0 0 1 700 350" fill="none" stroke="white" strokeWidth="3"/>
        </svg>

        {/* Floating particles */}
        <div className="absolute top-20 left-[20%] w-1 h-1 bg-emerald-400/40 rounded-full animate-float-1" />
        <div className="absolute top-40 left-[60%] w-1.5 h-1.5 bg-cyan-400/30 rounded-full animate-float-2" />
        <div className="absolute top-60 left-[80%] w-1 h-1 bg-emerald-300/40 rounded-full animate-float-3" />
        <div className="absolute top-32 left-[40%] w-0.5 h-0.5 bg-white/30 rounded-full animate-float-4" />
        <div className="absolute top-80 left-[15%] w-1 h-1 bg-emerald-400/30 rounded-full animate-float-2" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className={`w-full max-w-[420px] transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Logo section */}
          <div className={`text-center mb-10 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Glowing logo container */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-slow scale-150" />
              <div className="relative w-36 h-36 md:w-40 md:h-40 mx-auto rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-[3px] shadow-2xl shadow-emerald-500/30">
                <div className="w-full h-full rounded-full bg-[#030712] flex items-center justify-center overflow-hidden">
                  <img src="/zona-gol.png" alt="Zona Gol" className="w-28 h-28 md:w-32 md:h-32 object-contain" />
                </div>
              </div>
            </div>

            {/* Title with gradient */}
            <h1 className="font-orbitron text-3xl md:text-4xl font-black tracking-tight mb-2">
              <span className="bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
                ZONA GOL
              </span>
            </h1>
            <p className="text-gray-500 text-sm tracking-[0.2em] uppercase">
              Panel de Administración
            </p>
          </div>

          {/* Login card */}
          <div className={`relative transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Card glow effect */}
            <div className="absolute -inset-px bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent rounded-2xl blur-sm" />

            <div className="relative rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 backdrop-blur-xl p-8">
              {/* Decorative corner accents */}
              <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-emerald-500/30 rounded-tl-2xl" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-emerald-500/30 rounded-br-2xl" />

              {/* Session expired message */}
              {showExpiredMessage && (
                <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-400 text-sm font-medium">Tu sesión ha expirado</p>
                      <p className="text-amber-400/70 text-xs mt-1">
                        Por seguridad, inicia sesión nuevamente para continuar.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowExpiredMessage(false)}
                      className="text-amber-400/50 hover:text-amber-400 transition-colors ml-auto"
                    >
                      <span className="sr-only">Cerrar</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email field */}
                <div className={`space-y-2 transition-all duration-500 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                  <Label htmlFor="email" className="text-gray-400 text-xs tracking-wider uppercase font-medium">
                    Correo electrónico
                  </Label>
                  <div className="relative group">
                    <div className="absolute -inset-px bg-gradient-to-r from-emerald-500/50 to-cyan-500/50 rounded-xl opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      disabled={loading}
                      className="relative h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20 focus:bg-white/[0.08] transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className={`space-y-2 transition-all duration-500 delay-400 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                  <Label htmlFor="password" className="text-gray-400 text-xs tracking-wider uppercase font-medium">
                    Contraseña
                  </Label>
                  <div className="relative group">
                    <div className="absolute -inset-px bg-gradient-to-r from-emerald-500/50 to-cyan-500/50 rounded-xl opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      className="relative h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20 focus:bg-white/[0.08] transition-all duration-300 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors duration-200"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error messages */}
                {displayError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 animate-shake">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                      {displayError}
                    </p>
                  </div>
                )}

                {configError && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                    <p className="text-amber-400 text-sm">
                      Problema de configuración.{' '}
                      <a href="/debug-login" className="underline hover:text-amber-300 transition-colors">
                        Ver depuración
                      </a>
                    </p>
                  </div>
                )}

                {/* Submit button */}
                <div className={`pt-2 transition-all duration-500 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <Button
                    type="submit"
                    disabled={loading || configError}
                    className="relative w-full h-14 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:via-emerald-300 hover:to-emerald-400 text-white font-semibold rounded-xl border-0 overflow-hidden group transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {/* Button shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                    <span className="relative flex items-center justify-center gap-3">
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Entrando...</span>
                        </>
                      ) : (
                        <>
                          <span className="tracking-wide">ENTRAR</span>
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </form>

              {/* Forgot password */}
              <div className={`mt-6 text-center transition-all duration-500 delay-600 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="text-sm text-gray-500 hover:text-emerald-400 transition-colors duration-200 relative group">
                      <span>¿Olvidaste tu contraseña?</span>
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-[#0a0f1a] border-white/10 rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3 text-white font-orbitron">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <Mail className="w-5 h-5 text-emerald-400" />
                        </div>
                        Recuperar Contraseña
                      </DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Te enviaremos un enlace para restablecer tu contraseña.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordReset} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email" className="text-gray-400 text-xs tracking-wider uppercase">
                          Correo electrónico
                        </Label>
                        <Input
                          id="reset-email"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="tu@email.com"
                          required
                          disabled={resetLoading}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-emerald-500/50"
                        />
                      </div>
                      {resetMessage && (
                        <div className={`rounded-xl p-4 ${
                          resetMessage.type === 'success'
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'bg-red-500/10 border border-red-500/20'
                        }`}>
                          <p className={`text-sm ${resetMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {resetMessage.text}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsResetDialogOpen(false)
                            setResetEmail("")
                            setResetMessage(null)
                          }}
                          className="flex-1 h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
                          disabled={resetLoading}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl"
                          disabled={resetLoading || !resetEmail}
                        >
                          {resetLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Enviar"
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Home link */}
          <div className={`mt-8 text-center transition-all duration-500 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors duration-200 group"
            >
              <span className="w-8 h-px bg-gray-700 group-hover:bg-emerald-500 group-hover:w-12 transition-all duration-300" />
              <span>Volver al inicio</span>
              <span className="w-8 h-px bg-gray-700 group-hover:bg-emerald-500 group-hover:w-12 transition-all duration-300" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`py-6 text-center relative z-10 transition-all duration-500 delay-800 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-gray-600 text-xs tracking-widest uppercase">
          © 2025 Zona Gol — Gestión de Ligas
        </p>
      </footer>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.3; }
        }
        @keyframes float-1 {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-5px); }
          75% { transform: translateY(-30px) translateX(5px); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-15px) translateX(-10px); }
          66% { transform: translateY(-25px) translateX(10px); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-4 {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.5); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-pulse-slower {
          animation: pulse-slower 6s ease-in-out infinite;
        }
        .animate-float-1 {
          animation: float-1 8s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-2 10s ease-in-out infinite;
        }
        .animate-float-3 {
          animation: float-3 6s ease-in-out infinite;
        }
        .animate-float-4 {
          animation: float-4 7s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
