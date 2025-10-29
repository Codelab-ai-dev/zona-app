"use client"

import { useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { authActions } from "@/lib/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { toast } from "sonner"
import { SystemStats } from "@/components/super-admin/system-stats"
import { LeagueManagement } from "@/components/super-admin/league-management"
import { LeagueStats } from "@/components/league-admin/league-stats"
import { TournamentManagement } from "@/components/league-admin/tournament-management"
import { TeamManagement } from "@/components/league-admin/team-management"
import { ProfileSettings } from "@/components/league-admin/profile-settings"
import { CalendarView } from "@/components/league-admin/calendar-view"
import { FixtureGenerator } from "@/components/league-admin/fixture-generator"
import { DisciplineTable } from "@/components/league-admin/discipline-table"
import { SuspensionsManagement } from "@/components/league-admin/suspensions-management"
import { TopScorers } from "@/components/league-admin/top-scorers"
import { PlayoffBracketGenerator } from "@/components/league-admin/playoff-bracket-generator"
import { AppManagementSuperAdmin } from "@/components/super-admin/app-management-super-admin"
import { TeamStats } from "@/components/team-owner/team-stats"
import { TeamRecord } from "@/components/team-owner/team-record"
import { TeamScorers } from "@/components/team-owner/team-scorers"
import { PlayerManagement } from "@/components/team-owner/player-management"
import { CoachingStaffManagement } from "@/components/team-owner/coaching-staff-management"
import { TeamInfo } from "@/components/team-owner/team-info"
import { TeamUniforms } from "@/components/team-owner/team-uniforms"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [assigning, setAssigning] = useState(false)
  const [leagueIdInput, setLeagueIdInput] = useState("")

  // Debug logging
  console.log('🔍 Dashboard Debug:', {
    user: user?.email,
    profile: {
      id: profile?.id,
      role: profile?.role,
      league_id: profile?.league_id,
      team_id: profile?.team_id,
      name: profile?.name
    }
  })

  // Función temporal para asignar liga manualmente
  const handleAssignToLeague = async (leagueId: string) => {
    setAssigning(true)
    try {
      console.log('🔄 Intentando asignar league_id:', leagueId)
      await authActions.assignLeagueToCurrentUser(leagueId)
      console.log('✅ Liga asignada manualmente')
      // Refresh the page to update the profile
      window.location.reload()
    } catch (error) {
      console.error('❌ Error asignando liga:', error)
      toast.error('Error asignando liga: ' + (error as any).message)
    } finally {
      setAssigning(false)
    }
  }

  // Función para buscar leagues disponibles
  const handleFindAvailableLeagues = async () => {
    try {
      console.log('🔍 Buscando leagues disponibles...')
      // Get leagues from database
      const supabase = (await import('@/lib/supabase/client')).createClientSupabaseClient()
      const { data: leagues, error } = await (supabase
        .from('leagues') as any)
        .select('id, name, slug, description, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error obteniendo leagues:', error)
        return
      }

      console.log('📋 Leagues disponibles:', leagues)

      if (leagues && leagues.length > 0) {
        const leagueList = leagues.map((l: any) => `• ${l.name} (ID: ${l.id})`).join('\n')
        toast.info('Leagues disponibles', {
          description: leagueList,
          duration: 8000
        })
      } else {
        toast.warning('No se encontraron leagues activas')
      }
    } catch (error) {
      console.error('❌ Error:', error)
      toast.error('Error obteniendo leagues: ' + (error as any).message)
    }
  }

  const renderDashboardContent = () => {
    switch (profile?.role) {
      case "super_admin":
        return (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="leagues">Gestión de Ligas</TabsTrigger>
              <TabsTrigger value="apps">App Móvil</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <SystemStats />
            </TabsContent>
            <TabsContent value="leagues">
              <LeagueManagement />
            </TabsContent>
            <TabsContent value="apps">
              <AppManagementSuperAdmin />
            </TabsContent>
          </Tabs>
        )
      case "league_admin":
        // Verificar si el administrador tiene una liga asignada
        if (!profile?.league_id) {
          return (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Liga No Asignada</h2>
              <p className="text-gray-600 mb-4">
                No tienes una liga asignada todavía. 
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Contacta al super administrador para que te asigne una liga.
              </p>
              
              {/* Herramientas de debugging temporales */}
              <div className="space-y-3">
                <Button 
                  onClick={handleFindAvailableLeagues}
                  variant="outline"
                  className="mx-2"
                >
                  Ver Leagues Disponibles
                </Button>
                <div className="flex items-center space-x-2 justify-center">
                  <input 
                    type="text" 
                    placeholder="ID de Liga" 
                    className="border px-3 py-2 rounded"
                    onChange={(e) => setLeagueIdInput(e.target.value)}
                  />
                  <Button 
                    onClick={() => leagueIdInput && handleAssignToLeague(leagueIdInput)}
                    disabled={assigning || !leagueIdInput}
                    className="bg-soccer-blue hover:bg-soccer-blue-dark"
                  >
                    {assigning ? 'Asignando...' : 'Asignar Liga'}
                  </Button>
                </div>
              </div>
            </div>
          )
        }

        return (
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex w-auto md:grid md:w-full md:grid-cols-5 lg:grid-cols-10 gap-1 min-w-max">
                <TabsTrigger value="overview" className="text-sm whitespace-nowrap">Resumen</TabsTrigger>
                <TabsTrigger value="tournaments" className="text-sm whitespace-nowrap">Torneos</TabsTrigger>
                <TabsTrigger value="teams" className="text-sm whitespace-nowrap">Equipos</TabsTrigger>
                <TabsTrigger value="fixtures" className="text-sm whitespace-nowrap">Jornadas</TabsTrigger>
                <TabsTrigger value="playoffs" className="text-sm whitespace-nowrap">Liguilla</TabsTrigger>
                <TabsTrigger value="calendar" className="text-sm whitespace-nowrap">Calendario</TabsTrigger>
                <TabsTrigger value="scorers" className="text-sm whitespace-nowrap">Goleadores</TabsTrigger>
                <TabsTrigger value="discipline" className="text-sm whitespace-nowrap">Disciplina</TabsTrigger>
                <TabsTrigger value="suspensions" className="text-sm whitespace-nowrap">Suspensiones</TabsTrigger>
                <TabsTrigger value="settings" className="text-sm whitespace-nowrap">Configuración</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="overview">
              <LeagueStats leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="tournaments">
              <TournamentManagement leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="teams">
              <TeamManagement leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="fixtures">
              <FixtureGenerator leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="playoffs">
              <PlayoffBracketGenerator leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="calendar">
              <CalendarView leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="scorers">
              <TopScorers leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="discipline">
              <DisciplineTable leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="suspensions">
              <SuspensionsManagement leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="settings">
              <ProfileSettings />
            </TabsContent>
          </Tabs>
        )
      case "team_owner":
        // Verificar si el propietario tiene un equipo asignado
        if (!profile?.team_id) {
          return (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Equipo No Asignado</h2>
              <p className="text-gray-600 mb-4">
                No tienes un equipo asignado todavía.
              </p>
              <p className="text-gray-500 text-sm">
                Contacta al administrador de liga para que te asigne un equipo.
              </p>
            </div>
          )
        }

        return (
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex w-auto md:grid md:w-full md:grid-cols-7 gap-1 min-w-max">
                <TabsTrigger value="overview" className="text-sm whitespace-nowrap">Resumen</TabsTrigger>
                <TabsTrigger value="record" className="text-sm whitespace-nowrap">Estadísticas</TabsTrigger>
                <TabsTrigger value="scorers" className="text-sm whitespace-nowrap">Goleadores</TabsTrigger>
                <TabsTrigger value="players" className="text-sm whitespace-nowrap">Jugadores</TabsTrigger>
                <TabsTrigger value="coaching" className="text-sm whitespace-nowrap">Cuerpo Técnico</TabsTrigger>
                <TabsTrigger value="team" className="text-sm whitespace-nowrap">Mi Equipo</TabsTrigger>
                <TabsTrigger value="uniforms" className="text-sm whitespace-nowrap">Uniformes</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="overview">
              <TeamStats teamId={profile.team_id} />
            </TabsContent>
            <TabsContent value="record">
              <TeamRecord teamId={profile.team_id} />
            </TabsContent>
            <TabsContent value="scorers">
              <TeamScorers teamId={profile.team_id} />
            </TabsContent>
            <TabsContent value="players">
              <PlayerManagement teamId={profile.team_id} />
            </TabsContent>
            <TabsContent value="coaching">
              <CoachingStaffManagement teamId={profile.team_id} />
            </TabsContent>
            <TabsContent value="team">
              <TeamInfo teamId={profile.team_id} />
            </TabsContent>
            <TabsContent value="uniforms">
              <TeamUniforms teamId={profile.team_id} />
            </TabsContent>
          </Tabs>
        )
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bienvenido</h2>
            <p className="text-gray-600">Panel de usuario</p>
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
