"use client"

import { useState } from "react"

import { useAuth } from "@/lib/hooks/use-auth"
import { createClientSupabaseClient } from "@/lib/supabase/client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

import { CheckCircle, Eye, EyeOff, Lock, ShieldCheck, Sparkles, TriangleAlert, X } from "lucide-react"

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
  const { profile } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const checkPasswordStrength = (password: string) => {
    return passwordRequirements.map((req) => ({
      ...req,
      passed: req.test(password)
    }))
  }

  const isPasswordValid = (password: string) => {
    return passwordRequirements.every((req) => req.test(password))
  }

  const handleChangePassword = async () => {
    setMessage(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "Todos los campos son requeridos" })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Las contraseñas nuevas no coinciden" })
      return
    }

    if (!isPasswordValid(newPassword)) {
      setMessage({ type: "error", text: "La nueva contraseña no cumple con los requisitos de seguridad" })
      return
    }

    if (currentPassword === newPassword) {
      setMessage({ type: "error", text: "La nueva contraseña debe ser diferente a la actual" })
      return
    }

    setIsChanging(true)

    try {
      const supabase = createClientSupabaseClient()

      const { data: authData, error: verifyError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || "",
        password: currentPassword
      })

      if (verifyError || !authData.session) {
        setMessage({ type: "error", text: "La contraseña actual es incorrecta" })
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        setMessage({ type: "error", text: `Error al cambiar contraseña: ${updateError.message}` })
        return
      }

      setMessage({ type: "success", text: "Contraseña cambiada exitosamente" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("Password change error:", error)
      setMessage({ type: "error", text: `Error inesperado: ${error.message || "Error desconocido"}` })
    } finally {
      setIsChanging(false)
    }
  }

  const passwordStrength = checkPasswordStrength(newPassword)
  const strengthScore = passwordStrength.filter((item) => item.passed).length
  const strengthPercent = (strengthScore / passwordRequirements.length) * 100

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 text-white shadow-[0_24px_60px_rgba(56,189,248,0.25)]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-sky-500/15 to-purple-500/20" />
          <div className="absolute -top-16 right-16 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
          <CardContent className="relative flex flex-col gap-6 p-8">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar className="h-16 w-16 rounded-2xl border border-white/20 bg-white/20">
                <AvatarFallback className="text-xl font-semibold text-white">
                  {profile?.name?.[0] ?? "Z"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <Badge className="rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                  Seguridad de cuenta
                </Badge>
                <h2 className="text-2xl font-semibold leading-tight">
                  {profile?.name ? `${profile.name}` : "Cuenta Zona-Gol"}
                </h2>
                <p className="text-sm text-white/70">
                  Refuerza tu perfil con contraseñas robustas y recomendaciones personalizadas según tu rol.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-widest text-white/60">Rol</p>
                <p className="mt-2 text-lg font-semibold text-white">{profile?.role ?? "Administrador"}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-widest text-white/60">Último acceso</p>
                <p className="mt-2 text-lg font-semibold text-white">Hace unas horas</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-widest text-white/60">Estado</p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-200" />
                  Protegido
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-emerald-200" />
              Recomendaciones inteligentes
            </CardTitle>
            <CardDescription className="text-sm text-white/70">
              Acciones sugeridas para fortalecer aún más tu seguridad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/80">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="font-semibold text-white">Activa el doble factor</p>
              <p className="text-white/70">Añade una capa adicional desde la app móvil de administradores.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="font-semibold text-white">Revisa dispositivos confiables</p>
              <p className="text-white/70">Elimina accesos antiguos desde el panel de seguridad.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="font-semibold text-white">Programa recordatorios</p>
              <p className="text-white/70">Configura alertas trimestrales para rotar contraseñas críticas.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[28px] border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Lock className="h-5 w-5 text-emerald-500" />
              Actualizar contraseña
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              Sigue estos pasos para asegurar tu cuenta y mantener una contraseña robusta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert className={message.type === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
                <AlertDescription className={message.type === "success" ? "text-emerald-700" : "text-red-700"}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-password" className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Contraseña actual
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-12 rounded-2xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Nueva contraseña
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Crear contraseña segura"
                      className="h-12 rounded-2xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Confirmar contraseña
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu contraseña"
                      className="h-12 rounded-2xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-red-600">
                      <TriangleAlert className="h-4 w-4" />
                      Las contraseñas no coinciden
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Fortaleza de contraseña
                </p>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Nivel</span>
                    <Badge variant="outline" className="rounded-full border-emerald-300 text-emerald-600">
                      {strengthPercent === 0
                        ? "Por definir"
                        : strengthPercent < 60
                        ? "Medio"
                        : "Sólido"}
                    </Badge>
                  </div>
                  <Progress value={strengthPercent} className="h-2 rounded-full" />
                  <div className="space-y-2 text-sm">
                    {passwordStrength.map((req) => (
                      <div key={req.label} className="flex items-center gap-2">
                        {req.passed ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                        <span className={req.passed ? "text-emerald-700" : "text-slate-500"}>{req.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={
                isChanging ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword ||
                !isPasswordValid(newPassword)
              }
              className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 text-base font-semibold text-white hover:opacity-90"
            >
              {isChanging ? "Actualizando..." : "Guardar nueva contraseña"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-emerald-200" />
              Guía rápida de seguridad
            </CardTitle>
            <CardDescription className="text-sm text-white/70">
              Repaso visual de buenas prácticas para mantener tu cuenta protegida.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/80">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="font-semibold text-white">Usa contraseñas únicas</p>
              <p className="text-white/70">Evita reutilizar contraseñas entre paneles administrativos.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="font-semibold text-white">Actualiza periódicamente</p>
              <p className="text-white/70">Establece un recordatorio bimestral para rotar credenciales críticas.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="font-semibold text-white">No compartas acceso</p>
              <p className="text-white/70">Cada rol debe tener su propia cuenta con permisos controlados.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
