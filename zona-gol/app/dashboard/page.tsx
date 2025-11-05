"use client"

import { useEffect, useMemo, useState } from "react"

import { ProtectedRoute } from "@/components/layout/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AppManagementSuperAdmin } from "@/components/super-admin/app-management-super-admin"
import { LeagueManagement } from "@/components/super-admin/league-management"
import { SystemStats } from "@/components/super-admin/system-stats"
import { LeagueStats } from "@/components/league-admin/league-stats"
import { TournamentManagement } from "@/components/league-admin/tournament-management"
import { TeamManagement } from "@/components/league-admin/team-management"
import { FixtureGenerator } from "@/components/league-admin/fixture-generator"
import { PlayoffBracketGenerator } from "@/components/league-admin/playoff-bracket-generator"
import { CalendarView } from "@/components/league-admin/calendar-view"
import { TopScorers } from "@/components/league-admin/top-scorers"
import { DisciplineTable } from "@/components/league-admin/discipline-table"
import { SuspensionsManagement } from "@/components/league-admin/suspensions-management"
import { ProfileSettings } from "@/components/league-admin/profile-settings"
import { TeamStats } from "@/components/team-owner/team-stats"
import { TeamRecord } from "@/components/team-owner/team-record"
import { TeamScorers } from "@/components/team-owner/team-scorers"
import { PlayerManagement } from "@/components/team-owner/player-management"
import { CoachingStaffManagement } from "@/components/team-owner/coaching-staff-management"
import { TeamInfo } from "@/components/team-owner/team-info"
import { TeamUniforms } from "@/components/team-owner/team-uniforms"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/hooks/use-auth"
import { authActions } from "@/lib/actions/auth-actions"
import { toast } from "sonner"
import { CalendarDays, Compass, Rocket, ShieldCheck, Sparkles, Users } from "lucide-react"

export default function DashboardPage() {
  const { profile } = useAuth()
  const [assigning, setAssigning] = useState(false)
  const [leagueIdInput, setLeagueIdInput] = useState("")
  const [superAdminTab, setSuperAdminTab] = useState("overview")
  const [leagueAdminTab, setLeagueAdminTab] = useState("overview")
  const [teamOwnerTab, setTeamOwnerTab] = useState("overview")

  useEffect(() => {
    const handleQuickAction = (event: Event) => {
      if (!profile?.role) return
      const detail = (event as CustomEvent<{ tab: string; role: string }>).detail
      if (!detail || detail.role !== profile.role) return

      switch (profile.role) {
        case "super_admin":
          setSuperAdminTab(detail.tab)
          break
        case "league_admin":
          setLeagueAdminTab(detail.tab)
          break
        case "team_owner":
          setTeamOwnerTab(detail.tab)
          break
      }

      window.scrollTo({ top: 0, behavior: "smooth" })
    }

    window.addEventListener("dashboard:quick-action", handleQuickAction as EventListener)
    return () => window.removeEventListener("dashboard:quick-action", handleQuickAction as EventListener)
  }, [profile?.role])

  // Función temporal para asignar liga manualmente
  const handleAssignToLeague = async (leagueId: string) => {
    setAssigning(true)
    try {
      await authActions.assignLeagueToCurrentUser(leagueId)
      window.location.reload()
    } catch (error) {
      console.error("❌ Error asignando liga:", error)
      toast.error("Error asignando liga: " + (error as any).message)
    } finally {
      setAssigning(false)
    }
  }

  // Función para buscar leagues disponibles
  const handleFindAvailableLeagues = async () => {
    try {
      const supabase = (await import("@/lib/supabase/client")).createClientSupabaseClient()
      const { data: leagues, error } = await (supabase
        .from("leagues") as any)
        .select("id, name, slug, description, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Error obteniendo leagues:", error)
        return
      }

      if (leagues && leagues.length > 0) {
        const leagueList = leagues.map((l: any) => `• ${l.name} (ID: ${l.id})`).join("\n")
        toast.info("Ligas disponibles", {
          description: leagueList,
          duration: 8000
        })
      } else {
        toast.warning("No se encontraron ligas activas")
      }
    } catch (error) {
      console.error("❌ Error:", error)
      toast.error("Error obteniendo ligas: " + (error as any).message)
    }
  }

  const superAdminTimeline = useMemo(
    () => [
      {
        title: "Liga Elite registrada",
        description: "Se asignó un nuevo administrador de liga",
        tag: "Liga",
        time: "Hace 2 h"
      },
      {
        title: "Actualización de app móvil",
        description: "Versión 2.3 enviada a revisión",
        tag: "App",
        time: "Hace 5 h"
      },
      {
        title: "Reporte disciplinario",
        description: "2 suspensiones confirmadas en Liga Premier",
        tag: "Alertas",
        time: "Ayer"
      }
    ],
    []
  )

  const renderSuperAdmin = () => (
    <Tabs value={superAdminTab} onValueChange={setSuperAdminTab} className="space-y-8">
      <TabsList className="grid w-full gap-2 rounded-3xl border border-white/10 bg-white/5 p-2 sm:grid-cols-3">
        <TabsTrigger value="overview" className="rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
          Resumen
        </TabsTrigger>
        <TabsTrigger value="leagues" className="rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
          Gestión de Ligas
        </TabsTrigger>
        <TabsTrigger value="apps" className="rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
          App Móvil
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border border-white/10 bg-white/5 text-white shadow-[0_24px_60px_rgba(59,130,246,0.25)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <Rocket className="h-5 w-5 text-sky-200" />
                Actividad reciente del sistema
              </CardTitle>
              <CardDescription className="text-sm text-white/70">
                Bitácora ejecutiva para supervisar el estado general del ecosistema Zona-Gol
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {superAdminTimeline.map((item, index) => (
                <div key={index} className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <Badge className="rounded-full bg-white/20 text-xs font-semibold uppercase tracking-widest text-white">
                        {item.tag}
                      </Badge>
                      <span className="text-xs text-white/60">{item.time}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-white/70">{item.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="rounded-3xl border border-white/10 bg-white shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
            <div className="rounded-t-3xl bg-gradient-to-r from-emerald-500/20 via-sky-500/20 to-blue-500/20 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Visión general</h2>
              <p className="text-sm text-slate-600">
                Indicadores clave y KPIs agregados en tiempo real para administradores globales.
              </p>
            </div>
            <div className="p-6">
              <SystemStats />
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="leagues" className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
          <LeagueManagement />
        </div>
      </TabsContent>
      <TabsContent value="apps" className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
          <AppManagementSuperAdmin />
        </div>
      </TabsContent>
    </Tabs>
  )

  const renderLeagueAdmin = () => {
    if (!profile?.league_id) {
      return (
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-emerald-500/20 via-sky-500/15 to-transparent p-10 text-white shadow-[0_24px_75px_rgba(6,95,70,0.4)]">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/20 bg-white/10">
              <Compass className="h-7 w-7" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">Configura tu primera liga</h2>
              <p className="text-sm text-white/80">
                Asigna una liga para desbloquear el panel completo. Puedes solicitar una liga existente o crear una nueva desde el panel de soporte.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={handleFindAvailableLeagues}
                variant="secondary"
                className="rounded-full bg-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/30"
              >
                Explorar ligas disponibles
              </Button>
            </div>
            <div className="w-full max-w-md space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-widest text-white/60">Asignación manual</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="text"
                  placeholder="ID de liga"
                  className="flex-1 rounded-full border-white/20 bg-white/10 text-white placeholder:text-white/50"
                  onChange={(e) => setLeagueIdInput(e.target.value)}
                />
                <Button
                  onClick={() => leagueIdInput && handleAssignToLeague(leagueIdInput)}
                  disabled={assigning || !leagueIdInput}
                  className="rounded-full bg-white text-slate-900 hover:bg-white/80"
                >
                  {assigning ? "Asignando..." : "Asignar"}
                </Button>
              </div>
              <p className="text-xs text-white/60">
                También puedes contactar al soporte para crear una liga desde cero.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <Tabs value={leagueAdminTab} onValueChange={setLeagueAdminTab} className="space-y-8">
        <TabsList className="flex w-full gap-2 overflow-x-auto rounded-3xl border border-white/10 bg-white/5 p-2 lg:hidden">
          <TabsTrigger value="overview" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Torneos
          </TabsTrigger>
          <TabsTrigger value="teams" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Equipos
          </TabsTrigger>
          <TabsTrigger value="fixtures" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Jornadas
          </TabsTrigger>
          <TabsTrigger value="playoffs" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Liguilla
          </TabsTrigger>
          <TabsTrigger value="calendar" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Calendario
          </TabsTrigger>
          <TabsTrigger value="scorers" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Goleadores
          </TabsTrigger>
          <TabsTrigger value="discipline" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Disciplina
          </TabsTrigger>
          <TabsTrigger value="suspensions" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Suspensiones
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Configuración
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <TabsList className="sticky top-32 hidden h-fit flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-2 lg:flex">
            <TabsTrigger value="overview" className="justify-start rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
              Resumen
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="justify-start rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
              Torneos
            </TabsTrigger>
            <TabsTrigger value="teams" className="justify-start rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
              Equipos
            </TabsTrigger>
            <TabsTrigger value="fixtures" className="justify-start rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
              Jornadas
            </TabsTrigger>
            <TabsTrigger value="playoffs" className="justify-start rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
              Liguilla
            </TabsTrigger>
            <TabsTrigger value="calendar" className="justify-start rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
              Calendario
            </TabsTrigger>
            <TabsTrigger value="scorers" className="justify-start rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
              Goleadores
            </TabsTrigger>
            <TabsTrigger value="discipline" className="justify-start rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
              Disciplina
            </TabsTrigger>
            <TabsTrigger value="suspensions" className="justify-start rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
              Suspensiones
            </TabsTrigger>
            <TabsTrigger value="settings" className="justify-start rounded-2xl data-[state=active]:bg-white/20 data-[state=active]:text-white">
              Configuración
            </TabsTrigger>
          </TabsList>

          <div className="space-y-6">
            <TabsContent value="overview" className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
                <LeagueStats leagueId={profile.league_id} />
              </div>
              <Card className="rounded-3xl border border-white/10 bg-white/5 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <ShieldCheck className="h-5 w-5 text-emerald-200" />
                    Estado operativo
                  </CardTitle>
                  <CardDescription className="text-sm text-white/70">
                    Seguimiento de equipos inscritos, jornadas y disciplina activa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/60">Equipos</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{profile.league_id ? "Activos" : "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/60">Calendario</p>
                    <p className="mt-2 text-2xl font-semibold text-white">Sincronizado</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/60">Disciplina</p>
                    <p className="mt-2 text-2xl font-semibold text-white">Monitor activo</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="tournaments" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
              <TournamentManagement leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="teams" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
              <TeamManagement leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="fixtures" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
              <FixtureGenerator leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="playoffs" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
              <PlayoffBracketGenerator leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="calendar" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
              <CalendarView leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="scorers" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
              <TopScorers leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="discipline" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
              <DisciplineTable leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="suspensions" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
              <SuspensionsManagement leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="settings" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(14,116,144,0.25)]">
              <ProfileSettings />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    )
  }

  const renderTeamOwner = () => {
    if (!profile?.team_id) {
      return (
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-sky-500/25 via-indigo-500/15 to-transparent p-10 text-white shadow-[0_24px_75px_rgba(37,99,235,0.35)]">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/20 bg-white/10">
              <Users className="h-7 w-7" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">Aún no tienes un club asignado</h2>
              <p className="text-sm text-white/80">
                Solicita al administrador de tu liga que vincule tu equipo o inicia el asistente guiado para crear uno nuevo.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button className="rounded-full bg-white text-slate-900 hover:bg-white/90">Contactar administrador</Button>
              <Button variant="secondary" className="rounded-full bg-white/20 text-white hover:bg-white/30">
                Ver tutorial de registro
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <Tabs value={teamOwnerTab} onValueChange={setTeamOwnerTab} className="space-y-8">
        <TabsList className="flex w-full gap-2 overflow-x-auto rounded-3xl border border-white/10 bg-white/5 p-2">
          <TabsTrigger value="overview" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="record" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Estadísticas
          </TabsTrigger>
          <TabsTrigger value="scorers" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Goleadores
          </TabsTrigger>
          <TabsTrigger value="players" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Jugadores
          </TabsTrigger>
          <TabsTrigger value="coaching" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Cuerpo Técnico
          </TabsTrigger>
          <TabsTrigger value="team" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Mi Equipo
          </TabsTrigger>
          <TabsTrigger value="uniforms" className="rounded-2xl text-xs data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Uniformes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.25)]">
            <TeamStats teamId={profile.team_id} />
          </div>
          <Card className="rounded-3xl border border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <CalendarDays className="h-5 w-5 text-sky-200" />
                Próximos partidos
              </CardTitle>
              <CardDescription className="text-sm text-white/70">
                Mantén al staff y jugadores sincronizados con fechas clave.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/70">
              <p>Agenda dinámica disponible en la pestaña Calendario del panel de liga.</p>
              <p>Integra recordatorios en la app móvil para no perder ninguna cita.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="record" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.25)]">
          <TeamRecord teamId={profile.team_id} />
        </TabsContent>
        <TabsContent value="scorers" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.25)]">
          <TeamScorers teamId={profile.team_id} />
        </TabsContent>
        <TabsContent value="players" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.25)]">
          <PlayerManagement teamId={profile.team_id} />
        </TabsContent>
        <TabsContent value="coaching" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.25)]">
          <CoachingStaffManagement teamId={profile.team_id} />
        </TabsContent>
        <TabsContent value="team" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.25)]">
          <TeamInfo teamId={profile.team_id} />
        </TabsContent>
        <TabsContent value="uniforms" className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.25)]">
          <TeamUniforms teamId={profile.team_id} />
        </TabsContent>
      </Tabs>
    )
  }

  const renderDashboardContent = () => {
    switch (profile?.role) {
      case "super_admin":
        return renderSuperAdmin()
      case "league_admin":
        return renderLeagueAdmin()
      case "team_owner":
        return renderTeamOwner()
      default:
        return (
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-12 text-center text-white">
            <Sparkles className="mx-auto mb-4 h-10 w-10" />
            <h2 className="text-2xl font-semibold">Bienvenido a Zona-Gol</h2>
            <p className="mt-2 text-sm text-white/70">
              Selecciona un rol para descubrir el panel personalizado.
            </p>
          </div>
        )
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>{renderDashboardContent()}</DashboardLayout>
    </ProtectedRoute>
  )
}
