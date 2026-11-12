import { useState } from 'react'

import type { MyTeam } from './types'
import { QueryState } from '@/components/states'
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
import { TeamSettingsPage } from './pages/team-settings-page'
import { useMyTeams, useTeam } from './api'

const triggerClass =
  'text-xs whitespace-nowrap text-gray-400 dark:text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 dark:data-[state=active]:bg-green-500/20 dark:data-[state=active]:text-green-400 dark:data-[state=active]:border-transparent'

const tabs = [
  { value: 'overview', label: 'Resumen' },
  { value: 'standings', label: 'Posiciones' },
  { value: 'calendar', label: 'Calendario' },
  { value: 'record', label: 'Estadísticas' },
  { value: 'scorers', label: 'Goleadores' },
  { value: 'players', label: 'Jugadores' },
  { value: 'coaching', label: 'Cuerpo Técnico' },
  { value: 'team', label: 'Mi Equipo' },
  { value: 'uniforms', label: 'Uniformes' },
  { value: 'settings', label: 'Configuración' },
  { value: 'registrations', label: 'Solicitudes' },
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
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg mb-4">Equipo No Asignado</h1>
          <p className="text-white/80 drop-shadow mb-4">No tienes un equipo asignado todavía.</p>
          <p className="text-white/70 drop-shadow text-sm">Contacta al administrador de liga para que te asigne un equipo.</p>
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
    <section>
      <h1 className="sr-only">Mi Equipo</h1>
      {teams.length > 1 && (
        <div className="mb-4 max-w-xs space-y-2">
          <Label htmlFor="team-selector" className="text-gray-400 text-sm">Equipo</Label>
          <Select value={teamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger id="team-selector" className="w-full bg-slate-800/50 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-white hover:bg-slate-800">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Tabs key={teamId} value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <div className="w-full md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger aria-label="Seleccionar vista" className="w-full bg-slate-800/50 border-white/10 text-white">
              <SelectValue placeholder="Seleccionar vista" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {tabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value} className="text-white hover:bg-slate-800">
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden md:block overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto md:grid md:w-full md:grid-cols-11 gap-1 min-w-max h-auto bg-slate-800/50 border border-white/10">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className={triggerClass}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <TeamOverviewPage teamId={teamId} />
        </TabsContent>
        <TabsContent value="standings">
          <TeamStandingsPage teamId={teamId} />
        </TabsContent>
        <TabsContent value="calendar">
          <TeamCalendarPage teamId={teamId} />
        </TabsContent>
        <TabsContent value="record">
          <TeamRecordPage teamId={teamId} />
        </TabsContent>
        <TabsContent value="scorers">
          <TeamScorersPage teamId={teamId} />
        </TabsContent>
        <TabsContent value="players">
          <PlayerManagementPage teamId={teamId} />
        </TabsContent>
        <TabsContent value="coaching">
          <CoachingStaffPage teamId={teamId} />
        </TabsContent>
        <TabsContent value="team">
          <TeamInfoPage teamId={teamId} />
        </TabsContent>
        <TabsContent value="uniforms">
          <TeamUniformsPage teamId={teamId} />
        </TabsContent>
        <TabsContent value="settings">
          <TeamSettingsPage />
        </TabsContent>
        <TabsContent value="registrations">
          <RegistrationsTab teamId={teamId} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
