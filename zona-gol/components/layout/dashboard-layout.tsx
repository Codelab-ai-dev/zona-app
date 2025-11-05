"use client"

import type React from "react"
import { useMemo, useState } from "react"

import { useRouter } from "next/navigation"

import { AppDownload } from "@/components/shared/app-download"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useAuth } from "@/lib/hooks/use-auth"

import {
  BarChart3,
  Bell,
  Crown,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  Settings2,
  ShieldHalf,
  Smartphone,
  Sparkles,
  Trophy,
  User
} from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface RoleTheme {
  gradient: string
  glow: string
  icon: React.ComponentType<{ className?: string }>
  badgeClass: string
  accentChip: string
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const roleTheme = useMemo<RoleTheme>(() => {
    switch (profile?.role) {
      case "super_admin":
        return {
          gradient: "from-purple-600/90 via-pink-500/80 to-orange-400/70",
          glow: "shadow-[0_45px_120px_rgba(236,72,153,0.35)]",
          icon: Crown,
          badgeClass: "bg-gradient-to-r from-purple-500 to-rose-500 text-white",
          accentChip: "text-rose-100"
        }
      case "league_admin":
        return {
          gradient: "from-emerald-500/90 via-lime-500/80 to-sky-500/70",
          glow: "shadow-[0_45px_120px_rgba(56,189,248,0.3)]",
          icon: Trophy,
          badgeClass: "bg-gradient-to-r from-emerald-500 to-sky-500 text-slate-950",
          accentChip: "text-emerald-100"
        }
      case "team_owner":
        return {
          gradient: "from-sky-500/90 via-indigo-500/80 to-fuchsia-500/70",
          glow: "shadow-[0_45px_120px_rgba(129,140,248,0.35)]",
          icon: ShieldHalf,
          badgeClass: "bg-gradient-to-r from-sky-500 to-indigo-500 text-white",
          accentChip: "text-sky-100"
        }
      default:
        return {
          gradient: "from-slate-700/80 via-slate-600/70 to-slate-800/80",
          glow: "shadow-[0_45px_120px_rgba(100,116,139,0.25)]",
          icon: User,
          badgeClass: "bg-muted text-muted-foreground",
          accentChip: "text-white/70"
        }
    }
  }, [profile?.role])

  const quickActions = useMemo(() => {
    const actionsByRole = {
      super_admin: [
        { label: "Registrar liga", icon: PlusCircle, tab: "leagues" },
        { label: "KPIs globales", icon: BarChart3, tab: "overview" },
        { label: "Apps móviles", icon: Smartphone, tab: "apps" }
      ],
      league_admin: [
        { label: "Nuevo torneo", icon: PlusCircle, tab: "tournaments" },
        { label: "Calendario", icon: Sparkles, tab: "calendar" },
        { label: "Disciplina", icon: Settings2, tab: "discipline" }
      ],
      team_owner: [
        { label: "Actualizar plantel", icon: PlusCircle, tab: "players" },
        { label: "Revisar récord", icon: BarChart3, tab: "record" },
        { label: "Uniformes", icon: Sparkles, tab: "uniforms" }
      ],
      viewer: []
    } as const

    return actionsByRole[profile?.role as keyof typeof actionsByRole] ?? []
  }, [profile?.role])

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const handleQuickAction = (tab: string) => {
    if (!profile?.role) return
    window.dispatchEvent(
      new CustomEvent("dashboard:quick-action", {
        detail: { tab, role: profile.role }
      })
    )
  }

  const getRoleLabel = (role: string | undefined) => {
    switch (role) {
      case "super_admin":
        return "Super Administrador"
      case "league_admin":
        return "Administrador de Liga"
      case "team_owner":
        return "Dueño de Equipo"
      default:
        return "Usuario"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="sticky top-0 z-50">
        <div className={`relative overflow-hidden border-b border-white/10 bg-slate-900/75 backdrop-blur-xl ${roleTheme.glow}`}>
          <div className={`absolute inset-0 bg-gradient-to-r ${roleTheme.gradient} opacity-80`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_55%)]" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-1 items-center gap-5">
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-white/20 shadow-inner shadow-black/20">
                  <roleTheme.icon className="h-8 w-8 text-white" />
                  <div className="absolute inset-0 rounded-3xl border border-white/20" />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold leading-tight">
                      {profile ? `Hola, ${profile.name}` : "Panel Zona-Gol"}
                    </h1>
                    <Badge className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${roleTheme.badgeClass}`}>
                      {getRoleLabel(profile?.role)}
                    </Badge>
                  </div>
                  <p className={`text-sm ${roleTheme.accentChip}`}>
                    {profile?.role === "super_admin" && "Supervisa ecosistemas, métricas y despliegues móviles."}
                    {profile?.role === "league_admin" && "Gestiona torneos, calendarios y el día a día de tu liga."}
                    {profile?.role === "team_owner" && "Potencia la identidad de tu club con estadísticas y branding."}
                    {!profile?.role && "Personaliza tu experiencia con accesos rápidos y modo oscuro optimizado."}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-white/70">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                      <Sparkles className="h-4 w-4" />
                      Experiencia inmersiva 2024
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                      <Bell className="h-4 w-4" />
                      Notificaciones contextuales
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-3">
                <ThemeToggle />
                {profile?.role === "league_admin" && profile.league_id && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary" className="gap-2 rounded-full bg-white/15 text-white backdrop-blur">
                        <Smartphone className="h-4 w-4" />
                        App móvil
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Smartphone className="h-5 w-5 text-emerald-500" />
                          Descargar App Móvil
                        </DialogTitle>
                        <DialogDescription>
                          Comparte la aplicación oficial con equipos y staff de tu liga.
                        </DialogDescription>
                      </DialogHeader>
                      <AppDownload leagueId={profile.league_id} />
                    </DialogContent>
                  </Dialog>
                )}
                <Button
                  variant="ghost"
                  className="gap-2 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>

              <div className="lg:hidden">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-2xl border border-white/20 bg-white/10 text-white">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Abrir menú</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="flex w-[320px] flex-col overflow-hidden border-l border-white/10 bg-slate-950/95 p-0 text-white">
                    <SheetHeader className="border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-900/60 p-6">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                          <roleTheme.icon className="absolute inset-2 h-8 w-8 text-white" />
                        </div>
                        <div className="text-left">
                          <SheetTitle className="text-lg font-semibold">Zona-Gol</SheetTitle>
                          <p className="text-xs text-white/70">Panel adaptable por rol</p>
                        </div>
                      </div>
                    </SheetHeader>

                    <div className="flex flex-1 flex-col justify-between overflow-y-auto">
                      <div className="space-y-6 p-6">
                        {profile && (
                          <div className="rounded-3xl border border-white/15 bg-white/5 p-4">
                            <p className="text-sm font-semibold text-white">{profile.name}</p>
                            <p className="text-xs text-white/60">{getRoleLabel(profile.role)}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/70">
                              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Soporte inmediato
                              </span>
                              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                                <BarChart3 className="h-3.5 w-3.5" />
                                KPIs en vivo
                              </span>
                            </div>
                          </div>
                        )}

                        {profile?.role === "league_admin" && profile.league_id && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="secondary" className="w-full gap-2 rounded-2xl bg-white/15 text-white">
                                <Smartphone className="h-4 w-4" />
                                App móvil
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Smartphone className="h-5 w-5 text-emerald-500" />
                                  Descargar App Móvil
                                </DialogTitle>
                                <DialogDescription>
                                  Comparte la app de tu liga con clubes y aficionados.
                                </DialogDescription>
                              </DialogHeader>
                              <AppDownload leagueId={profile.league_id} />
                            </DialogContent>
                          </Dialog>
                        )}

                        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                          <p className="text-xs uppercase tracking-widest text-white/60">Microbrief</p>
                          <p>Gestiona tus pendientes desde el escritorio o app móvil con indicadores en tiempo real.</p>
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-white/10 p-6">
                        <Button
                          variant="ghost"
                          className="h-11 w-full gap-2 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
                          onClick={() => {
                            handleSignOut()
                            setMobileMenuOpen(false)
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Cerrar sesión
                        </Button>
                        <p className="text-center text-xs text-white/50">Zona-Gol · Experiencia adaptable</p>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {quickActions.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    onClick={() => handleQuickAction(action.tab)}
                    variant="secondary"
                    className="group gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 hover:bg-white/20"
                  >
                    <action.icon className="h-4 w-4 transition group-hover:scale-110" />
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-white/10 bg-slate-900/60 p-6 shadow-[0_24px_75px_rgba(8,47,73,0.35)] backdrop-blur-xl">
          {children}
        </div>
      </main>
    </div>
  )
}
