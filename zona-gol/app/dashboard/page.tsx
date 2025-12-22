"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@/lib/hooks/use-auth"
import { authActions } from "@/lib/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { toast } from "sonner"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLeagueFeatures } from "@/lib/hooks/use-league-features"
import { useActiveTournament } from "@/lib/queries"
import { Skeleton } from "@/components/ui/skeleton"

type Tournament = Database['public']['Tables']['tournaments']['Row']

// Loading skeleton para componentes
const ComponentSkeleton = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-1/3 bg-white/20" />
    <Skeleton className="h-32 w-full bg-white/20" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-24 bg-white/20" />
      <Skeleton className="h-24 bg-white/20" />
      <Skeleton className="h-24 bg-white/20" />
    </div>
  </div>
)

// LAZY LOADING: Componentes Super Admin
const SystemStats = dynamic(() => import("@/components/super-admin/system-stats").then(mod => ({ default: mod.SystemStats })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const LeagueManagement = dynamic(() => import("@/components/super-admin/league-management").then(mod => ({ default: mod.LeagueManagement })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const AppManagementSuperAdmin = dynamic(() => import("@/components/super-admin/app-management-super-admin").then(mod => ({ default: mod.AppManagementSuperAdmin })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})

// LAZY LOADING: Componentes League Admin (pesados)
const LeagueStats = dynamic(() => import("@/components/league-admin/league-stats").then(mod => ({ default: mod.LeagueStats })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const TournamentManagement = dynamic(() => import("@/components/league-admin/tournament-management").then(mod => ({ default: mod.TournamentManagement })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const TeamManagement = dynamic(() => import("@/components/league-admin/team-management").then(mod => ({ default: mod.TeamManagement })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const CalendarView = dynamic(() => import("@/components/league-admin/calendar-view").then(mod => ({ default: mod.CalendarView })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const FixtureGenerator = dynamic(() => import("@/components/league-admin/fixture-generator").then(mod => ({ default: mod.FixtureGenerator })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const DisciplineTable = dynamic(() => import("@/components/league-admin/discipline-table").then(mod => ({ default: mod.DisciplineTable })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const SuspensionsManagement = dynamic(() => import("@/components/league-admin/suspensions-management").then(mod => ({ default: mod.SuspensionsManagement })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const TopScorers = dynamic(() => import("@/components/league-admin/top-scorers").then(mod => ({ default: mod.TopScorers })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const PlayoffBracketGenerator = dynamic(() => import("@/components/league-admin/playoff-bracket-generator").then(mod => ({ default: mod.PlayoffBracketGenerator })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const GroupsManagement = dynamic(() => import("@/components/league-admin/groups-management").then(mod => ({ default: mod.GroupsManagement })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const QRBatchUpdate = dynamic(() => import("@/components/league-admin/qr-batch-update").then(mod => ({ default: mod.QRBatchUpdate })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const MatchResultEntry = dynamic(() => import("@/components/league-admin/match-result-entry").then(mod => ({ default: mod.MatchResultEntry })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const WhatsAppManagement = dynamic(() => import("@/components/league-admin/whatsapp-management").then(mod => ({ default: mod.WhatsAppManagement })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const StandingsManagement = dynamic(() => import("@/components/league-admin/standings-management").then(mod => ({ default: mod.StandingsManagement })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const ProfileSettings = dynamic(() => import("@/components/league-admin/profile-settings").then(mod => ({ default: mod.ProfileSettings })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})

// LAZY LOADING: Componentes Team Owner
const TeamStats = dynamic(() => import("@/components/team-owner/team-stats").then(mod => ({ default: mod.TeamStats })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const TeamRecord = dynamic(() => import("@/components/team-owner/team-record").then(mod => ({ default: mod.TeamRecord })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const TeamScorers = dynamic(() => import("@/components/team-owner/team-scorers").then(mod => ({ default: mod.TeamScorers })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const PlayerManagement = dynamic(() => import("@/components/team-owner/player-management").then(mod => ({ default: mod.PlayerManagement })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const CoachingStaffManagement = dynamic(() => import("@/components/team-owner/coaching-staff-management").then(mod => ({ default: mod.CoachingStaffManagement })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const TeamInfo = dynamic(() => import("@/components/team-owner/team-info").then(mod => ({ default: mod.TeamInfo })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})
const TeamUniforms = dynamic(() => import("@/components/team-owner/team-uniforms").then(mod => ({ default: mod.TeamUniforms })), {
  loading: () => <ComponentSkeleton />,
  ssr: false
})

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [assigning, setAssigning] = useState(false)
  const [leagueIdInput, setLeagueIdInput] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  // TanStack Query para cargar torneo activo (con caché)
  const leagueIdForTournament = profile?.role === 'league_admin' ? profile?.league_id : undefined
  const { data: activeTournament, isLoading: loadingTournament } = useActiveTournament(leagueIdForTournament || undefined)

  // Get league features for league_admin users
  const { hasFeature } = useLeagueFeatures(
    profile?.role === 'league_admin' ? (profile?.league_id ?? undefined) : undefined
  )

  // Debug logging
  // console.log('🔍 Dashboard Debug:', {
  //   user: user?.email,
  //   profile: {
  //     id: profile?.id,
  //     role: profile?.role,
  //     league_id: profile?.league_id,
  //     team_id: profile?.team_id,
  //     name: profile?.name
  //   }
  // })

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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
            <div className="w-full md:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full bg-slate-800/50 border-white/10 text-white">
                  <SelectValue placeholder="Seleccionar vista" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="overview" className="text-white hover:bg-slate-800">Resumen</SelectItem>
                  <SelectItem value="leagues" className="text-white hover:bg-slate-800">Gestión de Ligas</SelectItem>
                  <SelectItem value="apps" className="text-white hover:bg-slate-800">App Móvil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsList className="hidden md:grid w-full grid-cols-3 bg-slate-800/50 border border-white/10">
              <TabsTrigger value="overview" className="text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Resumen</TabsTrigger>
              <TabsTrigger value="leagues" className="text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Gestión de Ligas</TabsTrigger>
              <TabsTrigger value="apps" className="text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">App Móvil</TabsTrigger>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
            <div className="w-full md:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full bg-slate-800/50 border-white/10 text-white">
                  <SelectValue placeholder="Seleccionar vista" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="overview" className="text-white hover:bg-slate-800">Resumen</SelectItem>
                  <SelectItem value="tournaments" className="text-white hover:bg-slate-800">Torneos</SelectItem>
                  <SelectItem value="teams" className="text-white hover:bg-slate-800">Equipos</SelectItem>
                  {isGroupKnockout && <SelectItem value="groups" className="text-white hover:bg-slate-800">Grupos</SelectItem>}
                  {(isLeague || isGroupKnockout) && <SelectItem value="fixtures" className="text-white hover:bg-slate-800">{isGroupKnockout ? 'Partidos Grupos' : 'Jornadas'}</SelectItem>}
                  {(isKnockout || isGroupKnockout) && <SelectItem value="playoffs" className="text-white hover:bg-slate-800">{isGroupKnockout ? 'Eliminación' : 'Liguilla'}</SelectItem>}
                  <SelectItem value="calendar" className="text-white hover:bg-slate-800">Calendario</SelectItem>
                  <SelectItem value="results" className="text-white hover:bg-slate-800">Resultados</SelectItem>
                  <SelectItem value="standings" className="text-white hover:bg-slate-800">Posiciones</SelectItem>
                  <SelectItem value="scorers" className="text-white hover:bg-slate-800">Goleadores</SelectItem>
                  <SelectItem value="discipline" className="text-white hover:bg-slate-800">Disciplina</SelectItem>
                  <SelectItem value="suspensions" className="text-white hover:bg-slate-800">Suspensiones</SelectItem>
                  {hasFeature('qr_codes') && <SelectItem value="qr-management" className="text-white hover:bg-slate-800">Gestión QR</SelectItem>}
                  <SelectItem value="whatsapp" className="text-white hover:bg-slate-800">WhatsApp</SelectItem>
                  <SelectItem value="settings" className="text-white hover:bg-slate-800">Configuración</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden md:block overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className={`inline-flex w-auto md:grid md:w-full gap-1 min-w-max bg-slate-800/50 border border-white/10 ${gridCols}`}>
                <TabsTrigger value="overview" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Resumen</TabsTrigger>
                <TabsTrigger value="tournaments" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Torneos</TabsTrigger>
                <TabsTrigger value="teams" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Equipos</TabsTrigger>

                {/* Dynamic tabs based on tournament format */}
                {isGroupKnockout && (
                  <TabsTrigger value="groups" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Grupos</TabsTrigger>
                )}

                {(isLeague || isGroupKnockout) && (
                  <TabsTrigger value="fixtures" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                    {isGroupKnockout ? 'Partidos Grupos' : 'Jornadas'}
                  </TabsTrigger>
                )}

                {(isKnockout || isGroupKnockout) && (
                  <TabsTrigger value="playoffs" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                    {isGroupKnockout ? 'Eliminación' : 'Liguilla'}
                  </TabsTrigger>
                )}

                <TabsTrigger value="calendar" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Calendario</TabsTrigger>
                <TabsTrigger value="results" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Resultados</TabsTrigger>
                <TabsTrigger value="standings" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Posiciones</TabsTrigger>
                <TabsTrigger value="scorers" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Goleadores</TabsTrigger>
                <TabsTrigger value="discipline" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Disciplina</TabsTrigger>
                <TabsTrigger value="suspensions" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Suspensiones</TabsTrigger>
                {hasFeature('qr_codes') && (
                  <TabsTrigger value="qr-management" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Gestión QR</TabsTrigger>
                )}
                <TabsTrigger value="whatsapp" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">WhatsApp</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Configuración</TabsTrigger>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
            <div className="w-full md:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full bg-slate-800/50 border-white/10 text-white">
                  <SelectValue placeholder="Seleccionar vista" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="overview" className="text-white hover:bg-slate-800">Resumen</SelectItem>
                  <SelectItem value="record" className="text-white hover:bg-slate-800">Estadísticas</SelectItem>
                  <SelectItem value="scorers" className="text-white hover:bg-slate-800">Goleadores</SelectItem>
                  <SelectItem value="players" className="text-white hover:bg-slate-800">Jugadores</SelectItem>
                  <SelectItem value="coaching" className="text-white hover:bg-slate-800">Cuerpo Técnico</SelectItem>
                  <SelectItem value="team" className="text-white hover:bg-slate-800">Mi Equipo</SelectItem>
                  <SelectItem value="uniforms" className="text-white hover:bg-slate-800">Uniformes</SelectItem>
                  <SelectItem value="settings" className="text-white hover:bg-slate-800">Configuración</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden md:block overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex w-auto md:grid md:w-full md:grid-cols-8 gap-1 min-w-max bg-slate-800/50 border border-white/10">
                <TabsTrigger value="overview" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Resumen</TabsTrigger>
                <TabsTrigger value="record" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Estadísticas</TabsTrigger>
                <TabsTrigger value="scorers" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Goleadores</TabsTrigger>
                <TabsTrigger value="players" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Jugadores</TabsTrigger>
                <TabsTrigger value="coaching" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Cuerpo Técnico</TabsTrigger>
                <TabsTrigger value="team" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Mi Equipo</TabsTrigger>
                <TabsTrigger value="uniforms" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Uniformes</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs whitespace-nowrap text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Configuración</TabsTrigger>
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
