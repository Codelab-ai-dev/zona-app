"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { SimpleThemeToggle } from "@/components/ui/theme-toggle"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useAuth } from "@/lib/hooks/use-auth"
import { createClientSupabaseClient } from "@/lib/supabase/client"

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCircle2
} from "lucide-react"

interface RolePreview {
  title: string
  subtitle: string
  accent: string
  icon: React.ComponentType<{ className?: string }>
  tone: string
  description: string
  highlights: string[]
  resources: { label: string; description: string; href: string }[]
}

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [localError, setLocalError] = useState("")
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [roleTag, setRoleTag] = useState<"super_admin" | "league_admin" | "team_owner" | "viewer" | null>(null)
  const { signIn, loading, error, isAuthenticated } = useAuth()
  const router = useRouter()

  const roleHighlights = useMemo<Record<"super_admin" | "league_admin" | "team_owner" | "viewer", RolePreview>>(
    () => ({
      super_admin: {
        title: "Super Administrador",
        subtitle: "Control global",
        accent: "from-red-500/80 via-pink-500/70 to-orange-500/60",
        icon: Crown,
        tone: "text-red-100",
        description:
          "Gestiona el ecosistema completo: ligas, apps móviles y permisos. Ideal para el equipo central de Zona-Gol.",
        highlights: [
          "Monitoreo total del sistema",
          "Panel de métricas en vivo",
          "Gestión masiva de ligas"
        ],
        resources: [
          {
            label: "Checklist de lanzamiento",
            description: "Verifica la configuración global antes de liberar nuevas ligas.",
            href: "/docs/super-admin"
          },
          {
            label: "Guía de apps",
            description: "Administra builds y envíos a tiendas.",
            href: "/docs/mobile-app"
          }
        ]
      },
      league_admin: {
        title: "Administrador de Liga",
        subtitle: "Operación diaria",
        accent: "from-emerald-500/80 via-lime-500/70 to-sky-500/60",
        icon: Trophy,
        tone: "text-emerald-100",
        description:
          "Organiza torneos, calendarios y estadísticas de tu competencia con herramientas dinámicas y asistentes visuales.",
        highlights: [
          "Calendarios inteligentes",
          "Control disciplinario",
          "Integración con app móvil"
        ],
        resources: [
          {
            label: "Wizard de torneo",
            description: "Crea torneos en minutos con formatos predefinidos.",
            href: "/docs/league-admin"
          },
          {
            label: "Panel móvil",
            description: "Comparte la app oficial con clubes y árbitros.",
            href: "/docs/app-sharing"
          }
        ]
      },
      team_owner: {
        title: "Dueño de Equipo",
        subtitle: "Identidad del club",
        accent: "from-sky-500/80 via-indigo-500/70 to-fuchsia-500/60",
        icon: ShieldCheck,
        tone: "text-sky-100",
        description:
          "Administra plantillas, uniformes y datos de tu equipo con un enfoque en storytelling deportivo.",
        highlights: [
          "Dashboard de rendimiento",
          "Gestión de staff y jugadores",
          "Branding del club"
        ],
        resources: [
          {
            label: "Plantilla maestra",
            description: "Importa o sincroniza datos de jugadores.",
            href: "/docs/team-owner"
          },
          {
            label: "Guía de marca",
            description: "Personaliza uniformes y assets oficiales.",
            href: "/docs/branding"
          }
        ]
      },
      viewer: {
        title: "Bienvenido",
        subtitle: "Selecciona tu rol",
        accent: "from-slate-500/70 via-slate-400/60 to-slate-300/50",
        icon: UserCircle2,
        tone: "text-white",
        description:
          "Ingresa tu correo y contraseña. Detectaremos automáticamente tu rol para ajustar la experiencia de acceso.",
        highlights: [
          "Autenticación segura",
          "Modo oscuro optimizado",
          "Accesos directos personalizados"
        ],
        resources: [
          {
            label: "Centro de ayuda",
            description: "Resuelve dudas frecuentes sobre la plataforma.",
            href: "/docs/help"
          },
          {
            label: "Mesa de soporte",
            description: "Contacta al equipo de Zona-Gol.",
            href: "/docs/support"
          }
        ]
      }
    }),
    []
  )

  const demoCredentials = [
    { email: "admin@futbol.com", password: "password123", label: "Super administrador" },
    { email: "liga@futbol.com", password: "admin123", label: "Administrador de liga" },
    { email: "hggonzalezb84@gmail.com", password: "password123", label: "Dueño de equipo" }
  ]

  // Verificar si Supabase está configurado correctamente
  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const supabase = createClientSupabaseClient()
        const { data, error } = await supabase.from("users").select("count").limit(1)

        if (error) {
          console.error("Error de conexión a Supabase:", error)
          setLocalError("Error de conexión a la base de datos. Por favor, contacta al administrador.")
        } else {
          setSupabaseReady(true)
        }
      } catch (err) {
        console.error("Error al inicializar Supabase:", err)
        setLocalError("Error al inicializar la autenticación. Por favor, contacta al administrador.")
      }
    }

    checkSupabase()
  }, [])

  // Redireccionar si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    const normalized = email.trim().toLowerCase()

    if (!normalized) {
      setRoleTag(null)
      return
    }

    if (normalized.includes("super") || normalized.includes("global")) {
      setRoleTag("super_admin")
      return
    }

    if (normalized.includes("liga") || normalized.includes("league") || normalized.includes("admin")) {
      setRoleTag("league_admin")
      return
    }

    if (
      normalized.includes("team") ||
      normalized.includes("club") ||
      normalized.includes("owner") ||
      normalized.includes("coach")
    ) {
      setRoleTag("team_owner")
      return
    }

    setRoleTag("viewer")
  }, [email])

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
      const result = await signIn(email, password)

      if (result?.user) {
        // La redirección se manejará en el useEffect cuando isAuthenticated cambie
      } else {
        setLocalError("Autenticación incompleta. Por favor, intenta de nuevo.")
      }
    } catch (err: any) {
      if (err.message?.includes("Invalid login credentials")) {
        setLocalError("Credenciales inválidas. Por favor, verifica tu correo y contraseña.")
      } else if (err.message?.includes("network")) {
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
      setResetMessage({ type: "error", text: "Por favor, ingresa tu correo electrónico" })
      return
    }

    if (!supabaseReady) {
      setResetMessage({ type: "error", text: "El sistema no está listo. Por favor, intenta de nuevo." })
      return
    }

    setResetLoading(true)

    try {
      const supabase = createClientSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        setResetMessage({ type: "error", text: `Error: ${error.message}` })
      } else {
        setResetMessage({
          type: "success",
          text: "Se ha enviado un correo con instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada."
        })
        setResetEmail("")
      }
    } catch (err: any) {
      console.error("Password reset error:", err)
      setResetMessage({ type: "error", text: err.message || "Error al enviar correo de recuperación" })
    } finally {
      setResetLoading(false)
    }
  }

  const displayError = localError || error
  const configError = !supabaseReady && !loading
  const activePreview = roleTag ? roleHighlights[roleTag] : roleHighlights.viewer

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-16 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.35),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(59,130,246,0.3),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[url('/zona-fondo.png')] bg-cover bg-center opacity-10" />

      <div className="absolute right-6 top-6 z-20">
        <SimpleThemeToggle />
      </div>

      <div className="relative z-10 grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-[0_24px_75px_rgba(14,116,144,0.35)] backdrop-blur-xl">
          <div className={`absolute inset-0 bg-gradient-to-br ${activePreview.accent} opacity-60`} />
          <div className="absolute -top-24 right-16 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <CardContent className="relative flex h-full flex-col gap-10 p-10 text-white">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <Badge className="rounded-full border border-white/30 bg-white/10 px-3 text-xs font-semibold uppercase tracking-widest text-white">
                  Perfil detectado
                </Badge>
                <span className={`text-xs font-semibold uppercase tracking-[0.35em] ${activePreview.tone}`}>
                  {activePreview.subtitle}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/40 bg-white/20">
                  <activePreview.icon className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black leading-tight">{activePreview.title}</h2>
                  <p className="mt-2 max-w-md text-sm text-white/80">{activePreview.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs uppercase tracking-widest text-white/70">Lo que obtendrás</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {activePreview.highlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white/90"
                  >
                    <CheckCircle2 className="h-5 w-5 text-white" />
                    {highlight}
                  </div>
                ))}
              </div>
            </div>

            <Tabs defaultValue="recursos" className="mt-auto">
              <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1 text-white">
                <TabsTrigger value="recursos" className="rounded-xl data-[state=active]:bg-white/30 data-[state=active]:text-white">
                  Recursos
                </TabsTrigger>
                <TabsTrigger value="ayuda" className="rounded-xl data-[state=active]:bg-white/30 data-[state=active]:text-white">
                  Ayuda
                </TabsTrigger>
              </TabsList>
              <TabsContent value="recursos" className="mt-4 space-y-3">
                {activePreview.resources.map((resource) => (
                  <Link
                    key={resource.label}
                    href={resource.href}
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80 transition hover:bg-white/20"
                  >
                    <div>
                      <p className="font-semibold text-white">{resource.label}</p>
                      <p>{resource.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
                ))}
              </TabsContent>
              <TabsContent value="ayuda" className="mt-4 space-y-3 text-sm text-white/80">
                <p className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  ¿Necesitas credenciales de demo? Despliega el panel "Modo demo" para copiarlas.
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Usa tu correo corporativo para habilitar accesos automáticos por rol.
                </p>
              </TabsContent>
            </Tabs>

            <Accordion type="single" collapsible className="rounded-2xl border border-white/10 bg-white/5">
              <AccordionItem value="demo">
                <AccordionTrigger className="px-6 py-4 text-sm font-semibold text-white">
                  Modo demo y accesos rápidos
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-6 pb-5 text-sm text-white/80">
                  {demoCredentials.map((cred) => (
                    <div key={cred.email} className="rounded-xl border border-white/10 bg-white/10 p-4">
                      <p className="font-semibold text-white">{cred.label}</p>
                      <p className="mt-1">Correo: {cred.email}</p>
                      <p>Contraseña: {cred.password}</p>
                    </div>
                  ))}
                  <Link href="/debug-login" className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:underline">
                    <BookOpen className="h-4 w-4" />
                    Ver más opciones de depuración
                  </Link>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/80 shadow-[0_24px_75px_rgba(8,47,73,0.45)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-900/60 to-slate-950" />
          <div className="absolute -top-10 right-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
          <CardContent className="relative space-y-8 p-10">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <img src="/zona-gol-final.webp" alt="Zona Gol" className="h-12 w-12" />
                    <h1 className="text-2xl font-bold text-white">Panel de acceso</h1>
                  </div>
                  <p className="mt-2 text-sm text-white/70">
                    Introduce tus credenciales para acceder al dashboard modular de Zona-Gol.
                  </p>
                </div>
                <Badge
                  variant={supabaseReady ? "default" : "outline"}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${supabaseReady ? "bg-emerald-500/20 text-emerald-200" : "border-amber-300/50 text-amber-200"}`}
                >
                  {supabaseReady ? "Autenticación lista" : "Verificando"}
                </Badge>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-white/70">
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@zonagol.com"
                    required
                    disabled={loading}
                    className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-white/40 focus:border-emerald-400 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-white/70">
                  Contraseña
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 pr-12 text-white placeholder:text-white/40 focus:border-emerald-400 focus:ring-emerald-400"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {displayError && (
                <Alert variant="destructive" className="rounded-2xl border border-red-500/50 bg-red-500/10 text-red-100">
                  <AlertDescription>{displayError}</AlertDescription>
                </Alert>
              )}

              {configError && (
                <Alert className="rounded-2xl border border-amber-300/40 bg-amber-400/10 text-amber-100">
                  <AlertDescription>
                    Hay un problema con la configuración del sistema de autenticación. Visita la vista de
                    <Link href="/debug-login" className="ml-1 underline">
                      depuración
                    </Link>
                    o contacta al soporte.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="group flex h-12 w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-blue-500 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
                disabled={loading || configError}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Conectando
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    Iniciar sesión
                  </>
                )}
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 transition hover:text-emerald-100">
                    <HelpCircle className="h-4 w-4" />
                    ¿Olvidaste tu contraseña?
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Recuperar contraseña
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
                      />
                    </div>
                    {resetMessage && (
                      <Alert className={resetMessage.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                        <AlertDescription className={resetMessage.type === "success" ? "text-green-700" : "text-red-700"}>
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
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                        disabled={resetLoading || !resetEmail}
                      >
                        {resetLoading ? "Enviando..." : "Enviar enlace"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40">
                <Sparkles className="h-4 w-4" />
                UI Futurista 2024
              </span>
            </div>

            <Separator className="border-white/10" />

            <CardFooter className="flex flex-col gap-3 px-0">
              <Button
                asChild
                variant="ghost"
                className="h-11 w-full justify-center gap-2 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Regresar al inicio
                </Link>
              </Button>
              <p className="text-center text-xs text-white/50">
                ¿Problemas con tu cuenta? Escribe a soporte@zonagol.com o consulta la guía de inicio rápido.
              </p>
            </CardFooter>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
