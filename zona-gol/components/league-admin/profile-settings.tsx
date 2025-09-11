"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock, CheckCircle, X } from "lucide-react"
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

export function ProfileSettings() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const checkPasswordStrength = (password: string) => {
    return passwordRequirements.map(req => ({
      ...req,
      passed: req.test(password)
    }))
  }

  const isPasswordValid = (password: string) => {
    return passwordRequirements.every(req => req.test(password))
  }

  const handleChangePassword = async () => {
    setMessage(null)
    
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Todos los campos son requeridos' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' })
      return
    }

    if (!isPasswordValid(newPassword)) {
      setMessage({ type: 'error', text: 'La nueva contraseña no cumple con los requisitos de seguridad' })
      return
    }

    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'La nueva contraseña debe ser diferente a la actual' })
      return
    }

    setIsChanging(true)

    try {
      const supabase = createClientSupabaseClient()
      
      // Verificar contraseña actual intentando hacer login
      const { data: authData, error: verifyError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || '',
        password: currentPassword
      })

      if (verifyError) {
        setMessage({ type: 'error', text: 'La contraseña actual es incorrecta' })
        return
      }

      // Cambiar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        setMessage({ type: 'error', text: `Error al cambiar contraseña: ${updateError.message}` })
        return
      }

      setMessage({ type: 'success', text: 'Contraseña cambiada exitosamente' })
      
      // Limpiar formulario
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

    } catch (error: any) {
      console.error('Password change error:', error)
      setMessage({ type: 'error', text: `Error inesperado: ${error.message || 'Error desconocido'}` })
    } finally {
      setIsChanging(false)
    }
  }

  const passwordStrength = checkPasswordStrength(newPassword)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>
            Actualiza tu contraseña para mantener tu cuenta segura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

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
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Password requirements */}
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
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <Button 
              onClick={handleChangePassword}
              disabled={isChanging || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || !isPasswordValid(newPassword)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isChanging ? (
                <>
                  <Lock className="w-4 h-4 mr-2 animate-spin" />
                  Cambiando Contraseña...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Cambiar Contraseña
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consejos de Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Usa una contraseña única que no uses en otros sitios
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Cambia tu contraseña periódicamente
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              No compartas tu contraseña con nadie
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Usa un administrador de contraseñas si es posible
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}