"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock, CheckCircle, X, ArrowLeft } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase/client"

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "Al menos 8 caracteres", test: (pwd) => pwd.length >= 8 },
  { label: "Al menos una letra mayúscula", test: (pwd) => /[A-Z]/.test(pwd) },
  { label: "Al menos una letra minúscula", test: (pwd) => /[a-z]/.test(pwd) },
  { label: "Al menos un número", test: (pwd) => /\d/.test(pwd) },
  { label: "Al menos un carácter especial", test: (pwd) => /[!@#$%^&*(),.?\":{}|<>]/.test(pwd) }
]

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkResetSession = async () => {
      try {
        const supabase = createClientSupabaseClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          setMessage({ 
            type: 'error', 
            text: 'Enlace de recuperación inválido o expirado. Por favor, solicita un nuevo enlace.' 
          })
          setIsValidSession(false)
        } else {
          setIsValidSession(true)
        }
      } catch (error) {
        console.error('Error checking reset session:', error)
        setMessage({ 
          type: 'error', 
          text: 'Error al verificar el enlace de recuperación.' 
        })
        setIsValidSession(false)
      } finally {
        setCheckingSession(false)
      }
    }

    checkResetSession()
  }, [])

  const checkPasswordStrength = (password: string) => {
    return passwordRequirements.map(req => ({
      ...req,
      passed: req.test(password)
    }))
  }

  const isPasswordValid = (password: string) => {
    return passwordRequirements.every(req => req.test(password))
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Todos los campos son requeridos' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }

    if (!isPasswordValid(newPassword)) {
      setMessage({ type: 'error', text: 'La contraseña no cumple con los requisitos de seguridad' })
      return
    }

    setIsResetting(true)

    try {
      const supabase = createClientSupabaseClient()
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setMessage({ type: 'error', text: `Error al restablecer contraseña: ${error.message}` })
      } else {
        setMessage({ type: 'success', text: 'Contraseña restablecida exitosamente. Serás redirigido al login.' })
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch (error: any) {
      console.error('Password reset error:', error)
      setMessage({ type: 'error', text: `Error inesperado: ${error.message || 'Error desconocido'}` })
    } finally {
      setIsResetting(false)
    }
  }

  const passwordStrength = checkPasswordStrength(newPassword)

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/zona-fondo.png')] bg-cover bg-center p-0 relative">
        <div className="absolute inset-0 bg-black/70"></div>
        <Card className="w-full max-w-md overflow-hidden border-0 shadow-2xl rounded-lg relative z-10">
          <CardContent className="pt-6">
            <div className="text-center">
              <Lock className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
              <p>Verificando enlace de recuperación...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/zona-fondo.png')] bg-cover bg-center p-0 relative">
      <div className="absolute inset-0 bg-black/70"></div>
      <Card className="w-full max-w-md overflow-hidden border-0 shadow-2xl rounded-lg relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/zona-gol-final.webp" alt="Logo" className="w-16 h-16" />
            <h1 className="text-3xl font-bold text-green-600" style={{fontFamily: "var(--font-orbitron), sans-serif"}}>Zona-Gol</h1>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="w-5 h-5" />
            Restablecer Contraseña
          </CardTitle>
          <CardDescription>
            Ingresa tu nueva contraseña
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isValidSession ? (
            <div className="text-center space-y-4">
              {message && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}
              <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                <Link href="/login">Ir al Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {message && (
                <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa tu nueva contraseña"
                    className="pr-10"
                    disabled={isResetting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={isResetting}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium text-gray-700">Requisitos de contraseña:</p>
                    {passwordStrength.map((req, index) => (
                      <div key={index} className="flex items-center text-sm">
                        {req.passed ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        ) : (
                          <X className="w-4 h-4 text-red-500 mr-2" />
                        )}
                        <span className={req.passed ? 'text-green-700' : 'text-red-700'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirma tu nueva contraseña"
                    className="pr-10"
                    disabled={isResetting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isResetting}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              <Button 
                type="submit"
                disabled={isResetting || !newPassword || !confirmPassword || newPassword !== confirmPassword || !isPasswordValid(newPassword)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isResetting ? (
                  <>
                    <Lock className="w-4 h-4 mr-2 animate-spin" />
                    Restableciendo...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Restablecer Contraseña
                  </>
                )}
              </Button>
            </form>
          )}
          
          <div className="flex justify-center pt-4">
            <Button asChild variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <Link href="/login" className="flex items-center gap-2">
                <ArrowLeft size={16} />
                <span>Volver al Login</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[url('/zona-fondo.png')] bg-cover bg-center p-0 relative">
        <div className="absolute inset-0 bg-black/70"></div>
        <Card className="w-full max-w-md overflow-hidden border-0 shadow-2xl rounded-lg relative z-10">
          <CardContent className="pt-6">
            <div className="text-center">
              <Lock className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
              <p>Cargando...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}