"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { authActions } from "@/lib/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { toast } from "sonner"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"

type Tournament = Database['public']['Tables']['tournaments']['Row']
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
import { GroupsManagement } from "@/components/league-admin/groups-management"
import { QRBatchUpdate } from "@/components/league-admin/qr-batch-update"
import { MatchResultEntry } from "@/components/league-admin/match-result-entry"
import { WhatsAppManagement } from "@/components/league-admin/whatsapp-management"
import { StandingsManagement } from "@/components/league-admin/standings-management"
import { AppManagementSuperAdmin } from "@/components/super-admin/app-management-super-admin"
import { TeamStats } from "@/components/team-owner/team-stats"
import { TeamRecord } from "@/components/team-owner/team-record"
import { TeamScorers } from "@/components/team-owner/team-scorers"
import { PlayerManagement } from "@/components/team-owner/player-management"
import { CoachingStaffManagement } from "@/components/team-owner/coaching-staff-management"
import { TeamInfo } from "@/components/team-owner/team-info"
import { TeamUniforms } from "@/components/team-owner/team-uniforms"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLeagueFeatures } from "@/lib/hooks/use-league-features"

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [assigning, setAssigning] = useState(false)
  const [leagueIdInput, setLeagueIdInput] = useState("")
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null)
  const [loadingTournament, setLoadingTournament] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Get league features for league_admin users
  const { hasFeature } = useLeagueFeatures(
    profile?.role === 'league_admin' ? (profile?.league_id ?? undefined) : undefined
  )

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

  // Load active tournament for league admin
  useEffect(() => {
    const loadActiveTournament = async () => {
      if (profile?.role === 'league_admin' && profile?.league_id) {
        setLoadingTournament(true)
        try {
          const supabase = createClientSupabaseClient()
          const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .eq('league_id', profile.league_id)
            .eq('is_active', true)
            .single()

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error loading active tournament:', error)
          } else if (data) {
            setActiveTournament(data)
          }
        } catch (error) {
          console.error('Error loading active tournament:', error)
        } finally {
          setLoadingTournament(false)
        }
      }
    }

    loadActiveTournament()
  }, [profile?.role, profile?.league_id])

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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="w-full md:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full backdrop-blur-md bg-white/20 border-white/30 text-white">
                  <SelectValue placeholder="Seleccionar vista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Resumen</SelectItem>
                  <SelectItem value="leagues">Gestión de Ligas</SelectItem>
                  <SelectItem value="apps">App Móvil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsList className="hidden md:grid w-full grid-cols-3 backdrop-blur-md bg-white/20 border border-white/30">
              <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Resumen</TabsTrigger>
              <TabsTrigger value="leagues" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Gestión de Ligas</TabsTrigger>
              <TabsTrigger value="apps" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">App Móvil</TabsTrigger>
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
              <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-4">Liga No Asignada</h2>
              <p className="text-white/80 drop-shadow mb-4">
                No tienes una liga asignada todavía.
              </p>
              <p className="text-white/70 drop-shadow text-sm mb-6">
                Contacta al super administrador para que te asigne una liga.
              </p>

              {/* Herramientas de debugging temporales */}
              <div className="space-y-3">
                <Button
                  onClick={handleFindAvailableLeagues}
                  variant="outline"
                  className="mx-2 backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  Ver Leagues Disponibles
                </Button>
                <div className="flex items-center space-x-2 justify-center">
                  <input
                    type="text"
                    placeholder="ID de Liga"
                    className="backdrop-blur-md bg-white/20 border border-white/30 text-white placeholder:text-white/50 px-3 py-2 rounded focus:border-green-400 focus:ring-green-400/50"
                    onChange={(e) => setLeagueIdInput(e.target.value)}
                  />
                  <Button
                    onClick={() => leagueIdInput && handleAssignToLeague(leagueIdInput)}
                    disabled={assigning || !leagueIdInput}
                    className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"
                  >
                    {assigning ? 'Asignando...' : 'Asignar Liga'}
                  </Button>
                </div>
              </div>
            </div>
          )
        }

        // Determine tournament format for dynamic tabs
        const tournamentFormat = activeTournament?.tournament_format || 'league'
        const isGroupKnockout = tournamentFormat === 'group_knockout'
        const isKnockout = tournamentFormat === 'knockout'
        const isLeague = tournamentFormat === 'league'

        // Calculate grid columns based on features (+ WhatsApp tab + Standings tab)
        const hasQrFeature = hasFeature('qr_codes')
        const gridCols = isGroupKnockout
          ? (hasQrFeature ? 'md:grid-cols-5 lg:grid-cols-14' : 'md:grid-cols-5 lg:grid-cols-13')
          : isKnockout
            ? (hasQrFeature ? 'md:grid-cols-5 lg:grid-cols-13' : 'md:grid-cols-5 lg:grid-cols-12')
            : (hasQrFeature ? 'md:grid-cols-5 lg:grid-cols-14' : 'md:grid-cols-5 lg:grid-cols-13')

        return (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="w-full md:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full backdrop-blur-md bg-white/20 border-white/30 text-white">
                  <SelectValue placeholder="Seleccionar vista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Resumen</SelectItem>
                  <SelectItem value="tournaments">Torneos</SelectItem>
                  <SelectItem value="teams">Equipos</SelectItem>
                  {isGroupKnockout && <SelectItem value="groups">Grupos</SelectItem>}
                  {(isLeague || isGroupKnockout) && <SelectItem value="fixtures">{isGroupKnockout ? 'Partidos Grupos' : 'Jornadas'}</SelectItem>}
                  {(isKnockout || isGroupKnockout) && <SelectItem value="playoffs">{isGroupKnockout ? 'Eliminación' : 'Liguilla'}</SelectItem>}
                  <SelectItem value="calendar">Calendario</SelectItem>
                  <SelectItem value="results">Resultados</SelectItem>
                  <SelectItem value="standings">Posiciones</SelectItem>
                  <SelectItem value="scorers">Goleadores</SelectItem>
                  <SelectItem value="discipline">Disciplina</SelectItem>
                  <SelectItem value="suspensions">Suspensiones</SelectItem>
                  {hasFeature('qr_codes') && <SelectItem value="qr-management">Gestión QR</SelectItem>}
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="settings">Configuración</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden md:block overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className={`inline-flex w-auto md:grid md:w-full gap-1 min-w-max backdrop-blur-md bg-white/20 border border-white/30 ${gridCols}`}>
                <TabsTrigger value="overview" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Resumen</TabsTrigger>
                <TabsTrigger value="tournaments" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Torneos</TabsTrigger>
                <TabsTrigger value="teams" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Equipos</TabsTrigger>

                {/* Dynamic tabs based on tournament format */}
                {isGroupKnockout && (
                  <TabsTrigger value="groups" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Grupos</TabsTrigger>
                )}

                {(isLeague || isGroupKnockout) && (
                  <TabsTrigger value="fixtures" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">
                    {isGroupKnockout ? 'Partidos Grupos' : 'Jornadas'}
                  </TabsTrigger>
                )}

                {(isKnockout || isGroupKnockout) && (
                  <TabsTrigger value="playoffs" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">
                    {isGroupKnockout ? 'Eliminación' : 'Liguilla'}
                  </TabsTrigger>
                )}

                <TabsTrigger value="calendar" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Calendario</TabsTrigger>
                <TabsTrigger value="results" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Resultados</TabsTrigger>
                <TabsTrigger value="standings" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Posiciones</TabsTrigger>
                <TabsTrigger value="scorers" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Goleadores</TabsTrigger>
                <TabsTrigger value="discipline" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Disciplina</TabsTrigger>
                <TabsTrigger value="suspensions" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Suspensiones</TabsTrigger>
                {hasFeature('qr_codes') && (
                  <TabsTrigger value="qr-management" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Gestión QR</TabsTrigger>
                )}
                <TabsTrigger value="whatsapp" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">WhatsApp</TabsTrigger>
                <TabsTrigger value="settings" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Configuración</TabsTrigger>
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
            {isGroupKnockout && (
              <TabsContent value="groups">
                <GroupsManagement leagueId={profile.league_id} />
              </TabsContent>
            )}
            <TabsContent value="fixtures">
              <FixtureGenerator leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="playoffs">
              <PlayoffBracketGenerator leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="calendar">
              <CalendarView leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="results">
              <MatchResultEntry leagueId={profile.league_id} />
            </TabsContent>
            <TabsContent value="standings">
              <StandingsManagement key={activeTab === 'standings' ? Date.now() : 'standings'} leagueId={profile.league_id} />
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
            {hasFeature('qr_codes') && (
              <TabsContent value="qr-management">
                <QRBatchUpdate />
              </TabsContent>
            )}
            <TabsContent value="whatsapp">
              <WhatsAppManagement leagueId={profile.league_id} />
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
              <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-4">Equipo No Asignado</h2>
              <p className="text-white/80 drop-shadow mb-4">
                No tienes un equipo asignado todavía.
              </p>
              <p className="text-white/70 drop-shadow text-sm">
                Contacta al administrador de liga para que te asigne un equipo.
              </p>
            </div>
          )
        }

        return (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="w-full md:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full backdrop-blur-md bg-white/20 border-white/30 text-white">
                  <SelectValue placeholder="Seleccionar vista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Resumen</SelectItem>
                  <SelectItem value="record">Estadísticas</SelectItem>
                  <SelectItem value="scorers">Goleadores</SelectItem>
                  <SelectItem value="players">Jugadores</SelectItem>
                  <SelectItem value="coaching">Cuerpo Técnico</SelectItem>
                  <SelectItem value="team">Mi Equipo</SelectItem>
                  <SelectItem value="uniforms">Uniformes</SelectItem>
                  <SelectItem value="settings">Configuración</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden md:block overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex w-auto md:grid md:w-full md:grid-cols-8 gap-1 min-w-max backdrop-blur-md bg-white/20 border border-white/30">
                <TabsTrigger value="overview" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Resumen</TabsTrigger>
                <TabsTrigger value="record" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Estadísticas</TabsTrigger>
                <TabsTrigger value="scorers" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Goleadores</TabsTrigger>
                <TabsTrigger value="players" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Jugadores</TabsTrigger>
                <TabsTrigger value="coaching" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Cuerpo Técnico</TabsTrigger>
                <TabsTrigger value="team" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Mi Equipo</TabsTrigger>
                <TabsTrigger value="uniforms" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Uniformes</TabsTrigger>
                <TabsTrigger value="settings" className="text-sm whitespace-nowrap text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Configuración</TabsTrigger>
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
            <TabsContent value="settings">
              <ProfileSettings />
            </TabsContent>
          </Tabs>
        )
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-4">Bienvenido</h2>
            <p className="text-white/80 drop-shadow">Panel de usuario</p>
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
