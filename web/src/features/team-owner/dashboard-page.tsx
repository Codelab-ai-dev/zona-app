import { useState } from 'react'

import type { MyTeam } from './types'
import { EmptyState, QueryState } from '@/components/states'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { TeamOverviewPage } from './pages/team-overview-page'
import { TeamStandingsPage } from './pages/team-standings-page'
import { TeamCalendarPage } from './pages/team-calendar-page'
import { TeamRecordPage } from './pages/team-record-page'
import { TeamScorersPage } from './pages/team-scorers-page'
import { PlayerManagementPage } from './pages/player-management-page'
import { CoachingStaffPage } from './pages/coaching-staff-page'
import { PlayerRegistrationPage } from './pages/player-registration-page'
import { TeamInfoPage } from './pages/team-info-page'
import { TeamUniformsPage } from './pages/team-uniforms-page'
import { useMyTeams, useTeam } from './api'

const tabs = [
  { value: 'overview', label: 'Resumen' },
  { value: 'standings', label: 'Posiciones' },
  { value: 'calendar', label: 'Calendario' },
  { value: 'record', label: 'Estadísticas' },
  { value: 'scorers', label: 'Goleadores' },
  { value: 'players', label: 'Jugadores' },
  { value: 'coaching', label: 'Cuerpo Técnico' },
  { value: 'registrations', label: 'Solicitudes' },
  { value: 'team', label: 'Mi Equipo' },
  { value: 'uniforms', label: 'Uniformes' },
]

/**
 * Team owner dashboard. An owner may have several teams (GET /my-teams), so the
 * team comes from that list, never from the profile.
 */
export function DashboardPage() {
  const myTeams = useMyTeams()

  return (
    <QueryState
      query={myTeams}
      loadingLabel="Cargando equipo…"
      isEmpty={(res) => res.data.length === 0}
      empty={
        <div className="mx-auto max-w-2xl px-4 py-12">
          <EmptyState
            title="Equipo no asignado"
            description="No tienes un equipo asignado. Contacta al administrador de liga para que te asigne uno."
          />
        </div>
      }
    >
      {(res) => <TeamWorkspace teams={res.data} />}
    </QueryState>
  )
}

function RegistrationsTab({ teamId }: { teamId: string }) {
  const team = useTeam(teamId)
  return (
    <QueryState query={team} loadingLabel="Cargando equipo…">
      {(data) => <PlayerRegistrationPage teamId={teamId} tournamentId={data.tournament_id} />}
    </QueryState>
  )
}

function TeamWorkspace({ teams }: { teams: MyTeam[] }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? '')
  const teamId = teams.some((t) => t.id === selectedTeamId) ? selectedTeamId : (teams[0]?.id ?? '')

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Mi Equipo</h1>
        <p className="text-muted-foreground">Gestiona tu equipo y sus jugadores.</p>
        {teams.length > 1 && (
          <div className="mt-4 max-w-xs space-y-2">
            <Label htmlFor="team-selector">Equipo</Label>
            <Select value={teamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger id="team-selector" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </header>

      <Tabs key={teamId} value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile: select dropdown */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: tab list */}
        <TabsList className="hidden md:grid w-full grid-cols-3 lg:grid-cols-5">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab content */}
        <TabsContent value="overview" className="space-y-6">
          <TeamOverviewPage teamId={teamId} />
        </TabsContent>

        <TabsContent value="standings" className="space-y-6">
          <TeamStandingsPage teamId={teamId} />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <TeamCalendarPage teamId={teamId} />
        </TabsContent>

        <TabsContent value="record" className="space-y-6">
          <TeamRecordPage teamId={teamId} />
        </TabsContent>

        <TabsContent value="scorers" className="space-y-6">
          <TeamScorersPage teamId={teamId} />
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          <PlayerManagementPage teamId={teamId} />
        </TabsContent>

        <TabsContent value="coaching" className="space-y-6">
          <CoachingStaffPage teamId={teamId} />
        </TabsContent>

        <TabsContent value="registrations" className="space-y-6">
          <RegistrationsTab teamId={teamId} />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <TeamInfoPage teamId={teamId} />
        </TabsContent>

        <TabsContent value="uniforms" className="space-y-6">
          <TeamUniformsPage teamId={teamId} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
