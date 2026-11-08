import { AlertTriangle, Calendar, Target, Trophy, Users } from 'lucide-react'
import { useState } from 'react'

import { QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { useTeam, useTeamPlayers, useTeamMatches, useTeamPlayerStats, useTeamStats, useTeamSuspensions, useTopScorers } from '../api'
import { DisciplineTiles, GoalsPerPlayerTile, ParticipationSection } from '../components/player-derived-stats'
import { PositionsCard, ResultsCard, StatTile, SuspensionsCard } from '../components/overview-panels'
import { RefereeReportModal } from '../components/referee-report-modal'
import { glassCard, pageSubtitle, pageTitle } from '../glass'
import { useTeamNames } from '../team-names'
import { initials } from '../utils'
import type { TeamStats } from '../types'

const rankStyle = [
  'bg-yellow-500/30 text-yellow-300 border-yellow-300/50',
  'bg-gray-500/30 text-gray-300 border-gray-300/50',
  'bg-orange-500/30 text-orange-300 border-orange-300/50',
]

function HeadlineCards({ teamStat, active, total, upcoming }: { teamStat: TeamStats; active: number; total: number; upcoming: number }) {
  const cards = [
    { title: 'Jugadores Activos', value: active, total, icon: Users, note: 'Total registrados' },
    { title: 'Partidos Jugados', value: teamStat.matches_played, icon: Calendar, note: 'Total registrados' },
    {
      title: 'Victorias',
      value: teamStat.matches_won,
      total: teamStat.matches_played,
      icon: Trophy,
      note: teamStat.matches_played > 0 ? `${teamStat.matches_drawn} empates, ${teamStat.matches_lost} derrotas` : 'Total registrados',
    },
    { title: 'Próximos Partidos', value: upcoming, icon: Target, note: 'Partidos programados' },
  ]
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className={`${glassCard} hover:bg-white/15 transition-all`} data-slot="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90 drop-shadow">{stat.title}</CardTitle>
              <div className="p-2 rounded-full backdrop-blur-md bg-white/20 border border-white/30">
                <Icon className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                {stat.value}
                {stat.total !== undefined && stat.total > 0 && <span className="text-sm font-normal text-white/60">/{stat.total}</span>}
              </div>
              <CardDescription className="text-xs text-white/70 drop-shadow">{stat.note}</CardDescription>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function DetailedStats({ teamStat, teamId }: { teamStat: TeamStats; teamId: string }) {
  const scorers = useTopScorers(teamStat.tournament_id)
  const top = (scorers.data?.data ?? []).filter((p) => p.team_id === teamId).slice(0, 3)
  // Player-derived tiles need the per-player totals; without them the team-level tiles stay.
  const playerStats = useTeamPlayerStats(teamId, teamStat.tournament_id).data?.data
  return (
    <Card className={glassCard}>
      <CardHeader>
        <CardTitle className="flex items-center text-white drop-shadow-lg">
          <Trophy className="w-5 h-5 mr-2" aria-hidden="true" />
          Estadísticas Detalladas del Equipo
        </CardTitle>
        <CardDescription className="text-white/70 drop-shadow">Análisis completo del rendimiento colectivo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
            <Target className="w-5 h-5 mr-2 text-green-400" aria-hidden="true" />
            Rendimiento Ofensivo
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <StatTile label="Goles a Favor" value={teamStat.goals_for} valueClass="text-green-400" tint="p-4 backdrop-blur-md bg-green-500/20 rounded-xl border border-green-300/30 shadow-lg" />
            <StatTile label="Goles en Contra" value={teamStat.goals_against} valueClass="text-red-400" />
            <StatTile label="Diferencia de Goles" value={teamStat.goal_difference} valueClass="text-purple-400" tint="p-4 backdrop-blur-md bg-purple-500/20 rounded-xl border border-purple-300/30 shadow-lg" />
            <StatTile label="Vallas Invictas" value={teamStat.clean_sheets} />
            {playerStats && <GoalsPerPlayerTile players={playerStats} />}
          </div>
        </div>

        {top.length > 0 && (
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
              <Trophy className="w-5 h-5 mr-2 text-yellow-400" aria-hidden="true" />
              Máximos Goleadores
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              {top.map((player, index) => (
                <div key={player.player_id} className="p-4 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 hover:bg-white/15 hover:shadow-xl transition-all">
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-base sm:text-lg backdrop-blur-md border ${rankStyle[index]}`}>
                      {index + 1}
                    </div>
                    <Avatar className="w-10 h-10">
                      {player.photo ? <AvatarImage src={player.photo} alt={player.player_name} /> : null}
                      <AvatarFallback className="backdrop-blur-md bg-green-500/30 text-white border border-green-300/50">{initials(player.player_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-white drop-shadow">{player.player_name}</p>
                      <p className="text-xs text-white/70 drop-shadow">#{player.jersey_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400 drop-shadow-lg">{player.goals}</p>
                      <p className="text-xs text-white/70 drop-shadow">goles</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" aria-hidden="true" />
            Disciplina
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="p-4 backdrop-blur-md bg-yellow-500/20 rounded-xl border border-yellow-300/30 shadow-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-4 h-6 bg-yellow-400 rounded" />
                <p className="text-sm text-white/80 drop-shadow">Tarjetas Amarillas</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-400 drop-shadow-lg">{teamStat.yellow_cards}</p>
            </div>
            <div className="p-4 backdrop-blur-md bg-red-500/20 rounded-xl border border-red-300/30 shadow-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-4 h-6 bg-red-600 rounded" />
                <p className="text-sm text-white/80 drop-shadow">Tarjetas Rojas</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-red-400 drop-shadow-lg">{teamStat.red_cards}</p>
            </div>
            <StatTile label="Puntos" value={teamStat.points} valueClass="text-green-400" />
            {playerStats && <DisciplineTiles players={playerStats} />}
          </div>
        </div>

        {playerStats && <ParticipationSection players={playerStats} />}
      </CardContent>
    </Card>
  )
}

/** Resumen tab: headline numbers, detailed stats, positions, latest results and suspensions. */
export function TeamOverviewPage({ teamId }: { teamId: string }) {
  const team = useTeam(teamId)
  const stats = useTeamStats(teamId)
  const players = useTeamPlayers(teamId)
  const matches = useTeamMatches(teamId, { limit: 100 })
  const suspensions = useTeamSuspensions(teamId)
  const teamName = useTeamNames(teamId)
  const [reportMatchId, setReportMatchId] = useState<string | null>(null)

  const playerList = players.data?.data ?? []
  const matchList = matches.data?.data ?? []
  const upcoming = matchList.filter((m) => m.status === 'scheduled' && m.is_published).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className={pageTitle}>Estadísticas del Equipo</h2>
        <QueryState query={team} loadingLabel="Cargando información del equipo…">
          {(data) => <p className={pageSubtitle}>{data.name} - Resumen de rendimiento</p>}
        </QueryState>
      </div>

      <QueryState query={stats} isEmpty={(res) => res.data.length === 0} loadingLabel="Cargando estadísticas…">
        {(res) => {
          const teamStat = res.data[0]
          if (!teamStat) return null
          return (
            <>
              <HeadlineCards teamStat={teamStat} active={playerList.filter((p) => p.is_active).length} total={playerList.length} upcoming={upcoming} />
              <DetailedStats teamStat={teamStat} teamId={teamId} />
            </>
          )
        }}
      </QueryState>

      <div className="grid gap-4 md:grid-cols-3">
        <PositionsCard players={playerList} />
        <ResultsCard teamId={teamId} matches={matchList} teamName={teamName} onViewReport={setReportMatchId} />
        <SuspensionsCard suspensions={suspensions.data?.data ?? []} players={playerList} />
      </div>

      {reportMatchId && <RefereeReportModal open onOpenChange={(open) => !open && setReportMatchId(null)} matchId={reportMatchId} />}
    </div>
  )
}
