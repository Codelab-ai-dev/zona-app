"use client"

import { useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { authActions } from "@/lib/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { SystemStats } from "@/components/super-admin/system-stats"
import { LeagueManagement } from "@/components/super-admin/league-management"
import { LeagueStats } from "@/components/league-admin/league-stats"
import { TournamentManagement } from "@/components/league-admin/tournament-management"
import { TeamManagement } from "@/components/league-admin/team-management"
import { ProfileSettings } from "@/components/league-admin/profile-settings"
import { CalendarView } from "@/components/league-admin/calendar-view"
import { FixtureGenerator } from "@/components/league-admin/fixture-generator"
import { TeamStats } from "@/components/team-owner/team-stats"
import { PlayerManagement } from "@/components/team-owner/player-management"
import { TeamInfo } from "@/components/team-owner/team-info"
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
      alert('Error asignando liga: ' + (error as any).message)
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
        const leagueList = leagues.map((l: any) => `ID: ${l.id} | Nombre: ${l.name} | Slug: ${l.slug}`).join('\n')
        alert(`Leagues disponibles:\n\n${leagueList}`)
      } else {
        alert('No se encontraron leagues activas')
      }
    } catch (error) {
      console.error('❌ Error:', error)
      alert('Error obteniendo leagues: ' + (error as any).message)
    }
  }

  const renderDashboardContent = () => {
    switch (profile?.role) {
      case "super_admin":
        return (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="leagues">Gestión de Ligas</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <SystemStats />
            </TabsContent>
            <TabsContent value="leagues">
              <LeagueManagement />
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
                    className="bg-blue-600 hover:bg-blue-700"
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
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="tournaments">Torneos</TabsTrigger>
              <TabsTrigger value="teams">Equipos</TabsTrigger>
              <TabsTrigger value="fixtures">Jornadas</TabsTrigger>
              <TabsTrigger value="calendar">Calendario</TabsTrigger>
              <TabsTrigger value="settings">Configuración</TabsTrigger>
            </TabsList>
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
            <TabsContent value="calendar">
              <CalendarView leagueId={profile.league_id} />
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="players">Jugadores</TabsTrigger>
              <TabsTrigger value="team">Mi Equipo</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <TeamStats teamId={profile.team_id} />
            </TabsContent>
            <TabsContent value="players">
              <PlayerManagement teamId={profile.team_id} />
            </TabsContent>
            <TabsContent value="team">
              <TeamInfo teamId={profile.team_id} />
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
