"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Loader2, Trophy, Target, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TopScorerProps {
  leagueId: string
}

interface TeamData {
  id: string
  name: string
}

interface PlayerData {
  id: string
  name: string
  jersey_number: number
}

interface ScorerData {
  player_id: string
  player_name: string
  jersey_number: number
  team_name: string
  total_goals: number
  total_assists: number
  matches_played: number
  goals_per_match: number
}

export function TopScorers({ leagueId }: TopScorerProps) {
  const [scorers, setScorers] = useState<ScorerData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  // Estados para el modal de goles extemporáneos
  const [isAddGoalsOpen, setIsAddGoalsOpen] = useState(false)
  const [teams, setTeams] = useState<TeamData[]>([])
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [goalsToAdd, setGoalsToAdd] = useState<number>(1)
  const [assistsToAdd, setAssistsToAdd] = useState<number>(0)
  const [description, setDescription] = useState<string>("")
  const [savingGoals, setSavingGoals] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  // Estado para editar goles existentes
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<ScorerData | null>(null)
  const [editGoals, setEditGoals] = useState<number>(0)
  const [editAssists, setEditAssists] = useState<number>(0)

  useEffect(() => {
    loadTopScorers()
  }, [leagueId])

  // Cargar equipos cuando se abre el modal
  useEffect(() => {
    if (isAddGoalsOpen) {
      loadTeams()
    }
  }, [isAddGoalsOpen])

  // Cargar jugadores cuando se selecciona un equipo
  useEffect(() => {
    if (selectedTeamId) {
      loadPlayers(selectedTeamId)
    } else {
      setPlayers([])
      setSelectedPlayerId("")
    }
  }, [selectedTeamId])

  const loadTeams = async () => {
    setLoadingTeams(true)
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('league_id', leagueId)
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error loading teams:', error)
      toast.error('Error al cargar equipos')
    } finally {
      setLoadingTeams(false)
    }
  }

  const loadPlayers = async (teamId: string) => {
    setLoadingPlayers(true)
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, jersey_number')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('jersey_number')

      if (error) throw error
      setPlayers(data || [])
    } catch (error) {
      console.error('Error loading players:', error)
      toast.error('Error al cargar jugadores')
    } finally {
      setLoadingPlayers(false)
    }
  }

  const handleAddExtemporaneousGoals = async () => {
    if (!selectedPlayerId || goalsToAdd < 1) {
      toast.error('Selecciona un jugador y al menos 1 gol')
      return
    }

    setSavingGoals(true)
    try {
      // Verificar si ya existe un registro extemporáneo para este jugador (match_id IS NULL)
      const { data: existingStats, error: fetchError } = await supabase
        .from('player_stats')
        .select('id, goals, assists')
        .eq('player_id', selectedPlayerId)
        .is('match_id', null)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (existingStats) {
        // Actualizar el registro existente
        const { error: updateError } = await supabase
          .from('player_stats')
          .update({
            goals: existingStats.goals + goalsToAdd,
            assists: existingStats.assists + assistsToAdd,
          })
          .eq('id', existingStats.id)

        if (updateError) throw updateError
      } else {
        // Crear nuevo registro extemporáneo (match_id = null)
        const { error: insertError } = await supabase
          .from('player_stats')
          .insert({
            player_id: selectedPlayerId,
            match_id: null,
            goals: goalsToAdd,
            assists: assistsToAdd,
            yellow_cards: 0,
            red_cards: 0,
            minutes_played: 0,
          })

        if (insertError) throw insertError
      }

      toast.success(`Se agregaron ${goalsToAdd} gol(es) ${assistsToAdd > 0 ? `y ${assistsToAdd} asistencia(s)` : ''} correctamente`)

      // Resetear formulario y cerrar modal
      setSelectedTeamId("")
      setSelectedPlayerId("")
      setGoalsToAdd(1)
      setAssistsToAdd(0)
      setDescription("")
      setIsAddGoalsOpen(false)

      // Recargar goleadores
      loadTopScorers()
    } catch (error) {
      console.error('Error adding goals:', error)
      toast.error('Error al agregar goles')
    } finally {
      setSavingGoals(false)
    }
  }

  const handleEditScorer = (scorer: ScorerData) => {
    setEditingPlayer(scorer)
    setEditGoals(scorer.total_goals)
    setEditAssists(scorer.total_assists)
    setIsEditMode(true)
  }

  const handleUpdateScorer = async () => {
    if (!editingPlayer) return

    setSavingGoals(true)
    try {
      // Obtener todos los registros del jugador para calcular la diferencia
      const { data: allStats, error: fetchError } = await supabase
        .from('player_stats')
        .select('id, goals, assists, match_id')
        .eq('player_id', editingPlayer.player_id)

      if (fetchError) throw fetchError

      const currentTotal = allStats?.reduce((sum, s) => sum + (s.goals || 0), 0) || 0
      const currentAssists = allStats?.reduce((sum, s) => sum + (s.assists || 0), 0) || 0
      const goalsDiff = editGoals - currentTotal
      const assistsDiff = editAssists - currentAssists

      if (goalsDiff === 0 && assistsDiff === 0) {
        toast.info('No hay cambios que guardar')
        setIsEditMode(false)
        setEditingPlayer(null)
        return
      }

      // Buscar registro extemporáneo existente (match_id IS NULL)
      const extemporaneousRecord = allStats?.find(s => s.match_id === null)

      if (extemporaneousRecord) {
        // Actualizar registro extemporáneo existente
        const newGoals = Math.max(0, extemporaneousRecord.goals + goalsDiff)
        const newAssists = Math.max(0, extemporaneousRecord.assists + assistsDiff)

        if (newGoals === 0 && newAssists === 0) {
          // Si quedan en 0, eliminar el registro extemporáneo
          await supabase
            .from('player_stats')
            .delete()
            .eq('id', extemporaneousRecord.id)
        } else {
          await supabase
            .from('player_stats')
            .update({ goals: newGoals, assists: newAssists })
            .eq('id', extemporaneousRecord.id)
        }
      } else if (goalsDiff > 0 || assistsDiff > 0) {
        // Crear nuevo registro extemporáneo (match_id = null)
        await supabase
          .from('player_stats')
          .insert({
            player_id: editingPlayer.player_id,
            match_id: null,
            goals: Math.max(0, goalsDiff),
            assists: Math.max(0, assistsDiff),
            yellow_cards: 0,
            red_cards: 0,
            minutes_played: 0,
          })
      }

      toast.success('Estadísticas actualizadas correctamente')
      setIsEditMode(false)
      setEditingPlayer(null)
      loadTopScorers()
    } catch (error) {
      console.error('Error updating scorer:', error)
      toast.error('Error al actualizar estadísticas')
    } finally {
      setSavingGoals(false)
    }
  }

  const handleDeleteExtemporaneousGoals = async (playerId: string) => {
    if (!confirm('¿Estás seguro de eliminar los goles extemporáneos de este jugador?')) return

    try {
      const { error } = await supabase
        .from('player_stats')
        .delete()
        .eq('player_id', playerId)
        .is('match_id', null)

      if (error) throw error

      toast.success('Goles extemporáneos eliminados')
      loadTopScorers()
    } catch (error) {
      console.error('Error deleting extemporaneous goals:', error)
      toast.error('Error al eliminar goles')
    }
  }

  const loadTopScorers = async () => {
    setLoading(true)
    try {
      console.log('🔍 Loading top scorers for league:', leagueId)

      // First, get all teams in this league
      const { data: leagueTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('league_id', leagueId)

      if (teamsError) {
        console.error('❌ Error loading league teams:', teamsError)
        return
      }

      const teamIds = leagueTeams?.map(t => t.id) || []
      console.log('🏟️ Teams in league:', teamIds.length, teamIds)

      if (teamIds.length === 0) {
        console.warn('⚠️ No teams found in this league')
        setScorers([])
        return
      }

      // Query to get all player stats for players in these teams
      const { data: statsData, error } = await supabase
        .from('player_stats')
        .select(`
          player_id,
          goals,
          assists,
          match_id,
          player:players!inner(
            name,
            jersey_number,
            team_id,
            team:teams(
              name,
              league_id
            )
          )
        `)
        .in('player.team_id', teamIds)
        .gt('goals', 0)
        .order('goals', { ascending: false })

      console.log('📊 Player stats query result:', {
        count: statsData?.length,
        error,
        sample: statsData?.[0]
      })

      if (error) {
        console.error('❌ Error loading scorers:', error)
        return
      }

      // Aggregate stats by player (no filtering needed, query already filtered)
      const playerStatsMap = new Map<string, {
        player_id: string
        player_name: string
        jersey_number: number
        team_name: string
        total_goals: number
        total_assists: number
        matches_played: number
      }>()

      statsData?.forEach((stat: any) => {
        const player = stat.player

        if (!player) {
          console.warn('⚠️ Stat without player:', stat)
          return
        }

        const playerId = stat.player_id
        const existing = playerStatsMap.get(playerId)

        if (existing) {
          existing.total_goals += stat.goals || 0
          existing.total_assists += stat.assists || 0
          existing.matches_played += 1
        } else {
          playerStatsMap.set(playerId, {
            player_id: playerId,
            player_name: player.name,
            jersey_number: player.jersey_number || 0,
            team_name: player.team?.name || 'Sin equipo',
            total_goals: stat.goals || 0,
            total_assists: stat.assists || 0,
            matches_played: 1,
          })
        }
      })

      console.log('📈 Stats processing:', {
        totalStats: statsData?.length,
        uniquePlayers: playerStatsMap.size,
        playersList: Array.from(playerStatsMap.values()).map(p => ({
          name: p.player_name,
          team: p.team_name,
          goals: p.total_goals
        }))
      })

      // Convert map to array and calculate goals per match
      const scorersArray = Array.from(playerStatsMap.values())
        .map(scorer => ({
          ...scorer,
          goals_per_match: scorer.matches_played > 0
            ? Number((scorer.total_goals / scorer.matches_played).toFixed(2))
            : 0,
        }))
        .sort((a, b) => {
          // Sort by total goals (descending), then by assists
          if (b.total_goals !== a.total_goals) {
            return b.total_goals - a.total_goals
          }
          return b.total_assists - a.total_assists
        })

      console.log('⚽ Final scorers array:', {
        totalScorers: scorersArray.length,
        topScorer: scorersArray[0]?.player_name,
        topGoals: scorersArray[0]?.total_goals,
        allScorers: scorersArray.map(s => `${s.player_name}: ${s.total_goals} goals`)
      })

      setScorers(scorersArray)
    } catch (error) {
      console.error('Error loading scorers:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPositionBadge = (position: number) => {
    if (position === 1) {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
          🥇 1°
        </Badge>
      )
    } else if (position === 2) {
      return (
        <Badge className="bg-gray-400 hover:bg-gray-500 text-white">
          🥈 2°
        </Badge>
      )
    } else if (position === 3) {
      return (
        <Badge className="bg-orange-600 hover:bg-orange-700 text-white">
          🥉 3°
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="font-bold">
          {position}°
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Tabla de Goleadores</h2>
          <p className="text-white/80 drop-shadow">Ranking de goleadores de la liga</p>
        </div>
        <Button
          onClick={() => setIsAddGoalsOpen(true)}
          className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Goles
        </Button>
      </div>

      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Trophy className="w-5 h-5 text-yellow-300" />
            Top Goleadores
          </CardTitle>
          <CardDescription className="text-white/80 drop-shadow">
            {scorers.length > 0 ? `${scorers.length} jugadores con goles` : 'No hay goles registrados aún'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-3 text-white" />
              <span className="text-base sm:text-lg text-white drop-shadow">Cargando goleadores...</span>
            </div>
          ) : scorers.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-white/50 mb-4" />
              <p className="text-white/80 drop-shadow">No hay goles registrados en la liga todavía</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-white/5">
                    <TableHead className="w-20 text-white/90">Posición</TableHead>
                    <TableHead className="text-white/90">Jugador</TableHead>
                    <TableHead className="text-center text-white/90">Dorsal</TableHead>
                    <TableHead className="text-white/90">Equipo</TableHead>
                    <TableHead className="text-center text-white/90">Partidos</TableHead>
                    <TableHead className="text-center text-white/90">Goles</TableHead>
                    <TableHead className="text-center text-white/90">Asistencias</TableHead>
                    <TableHead className="text-center text-white/90">Promedio</TableHead>
                    <TableHead className="text-center text-white/90">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scorers.map((scorer, index) => {
                    const position = index + 1
                    const isTopThree = position <= 3
                    return (
                      <TableRow
                        key={scorer.player_id}
                        className={`border-white/20 ${isTopThree ? 'bg-yellow-500/10' : 'hover:bg-white/5'}`}
                      >
                        <TableCell>{getPositionBadge(position)}</TableCell>
                        <TableCell className="font-semibold text-white drop-shadow">
                          {scorer.player_name}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="font-bold backdrop-blur-md bg-white/10 text-white border-white/30">
                            #{scorer.jersey_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/80 drop-shadow">
                          {scorer.team_name}
                        </TableCell>
                        <TableCell className="text-center text-white/70">
                          {scorer.matches_played}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0">
                            ⚽ {scorer.total_goals}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="backdrop-blur-md bg-blue-500/80 text-white border-0">
                            {scorer.total_assists}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-white/70">
                          {scorer.goals_per_match.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditScorer(scorer)}
                            className="text-white/70 hover:text-white hover:bg-white/10"
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 3 Podium */}
      {scorers.length >= 3 && (
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
              <Trophy className="w-5 h-5 text-yellow-300" />
              Podio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {/* 2nd Place */}
              <div className="text-center order-1">
                <div className="h-32 backdrop-blur-md bg-gray-400/80 rounded-t-lg flex items-end justify-center pb-4">
                  <span className="text-4xl">🥈</span>
                </div>
                <div className="backdrop-blur-xl bg-white/10 p-4 rounded-b-lg border-t-4 border-gray-300">
                  <p className="font-bold text-base sm:text-lg text-white drop-shadow">{scorers[1].player_name}</p>
                  <p className="text-sm text-white/70 drop-shadow">{scorers[1].team_name}</p>
                  <p className="text-2xl font-bold text-gray-300 mt-2 drop-shadow">
                    {scorers[1].total_goals} ⚽
                  </p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="text-center order-2">
                <div className="h-40 backdrop-blur-md bg-yellow-400/80 rounded-t-lg flex items-end justify-center pb-4">
                  <span className="text-5xl">🥇</span>
                </div>
                <div className="backdrop-blur-xl bg-white/10 p-4 rounded-b-lg border-t-4 border-yellow-400">
                  <p className="font-bold text-xl text-white drop-shadow">{scorers[0].player_name}</p>
                  <p className="text-sm text-white/70 drop-shadow">{scorers[0].team_name}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-300 mt-2 drop-shadow">
                    {scorers[0].total_goals} ⚽
                  </p>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="text-center order-3">
                <div className="h-24 backdrop-blur-md bg-orange-500/80 rounded-t-lg flex items-end justify-center pb-4">
                  <span className="text-2xl sm:text-3xl">🥉</span>
                </div>
                <div className="backdrop-blur-xl bg-white/10 p-4 rounded-b-lg border-t-4 border-orange-500">
                  <p className="font-bold text-base sm:text-lg text-white drop-shadow">{scorers[2].player_name}</p>
                  <p className="text-sm text-white/70 drop-shadow">{scorers[2].team_name}</p>
                  <p className="text-2xl font-bold text-orange-400 mt-2 drop-shadow">
                    {scorers[2].total_goals} ⚽
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal para agregar goles extemporáneos */}
      <Dialog open={isAddGoalsOpen} onOpenChange={setIsAddGoalsOpen}>
        <DialogContent className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white drop-shadow-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-400" />
              Agregar Goles Extemporáneos
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Agrega goles históricos a jugadores para ligas que comenzaron antes del sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Selector de equipo */}
            <div className="space-y-2">
              <Label className="text-white/90">Equipo</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white">
                  <SelectValue placeholder={loadingTeams ? "Cargando equipos..." : "Selecciona un equipo"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id} className="text-white hover:bg-white/10">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de jugador */}
            <div className="space-y-2">
              <Label className="text-white/90">Jugador</Label>
              <Select
                value={selectedPlayerId}
                onValueChange={setSelectedPlayerId}
                disabled={!selectedTeamId}
              >
                <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white disabled:opacity-50">
                  <SelectValue placeholder={
                    !selectedTeamId
                      ? "Primero selecciona un equipo"
                      : loadingPlayers
                        ? "Cargando jugadores..."
                        : "Selecciona un jugador"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id} className="text-white hover:bg-white/10">
                      #{player.jersey_number} - {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cantidad de goles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/90">Goles</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={goalsToAdd}
                  onChange={(e) => setGoalsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                  className="backdrop-blur-md bg-white/10 border-white/30 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/90">Asistencias (opcional)</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={assistsToAdd}
                  onChange={(e) => setAssistsToAdd(Math.max(0, parseInt(e.target.value) || 0))}
                  className="backdrop-blur-md bg-white/10 border-white/30 text-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddGoalsOpen(false)}
              className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddExtemporaneousGoals}
              disabled={savingGoals || !selectedPlayerId || goalsToAdd < 1}
              className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"
            >
              {savingGoals ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Goles
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para editar goles de un jugador existente */}
      <Dialog open={isEditMode} onOpenChange={(open) => {
        if (!open) {
          setIsEditMode(false)
          setEditingPlayer(null)
        }
      }}>
        <DialogContent className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white drop-shadow-lg">
              Editar Estadísticas - {editingPlayer?.player_name}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Modifica los goles y asistencias totales del jugador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/90">Total Goles</Label>
                <Input
                  type="number"
                  min={0}
                  value={editGoals}
                  onChange={(e) => setEditGoals(Math.max(0, parseInt(e.target.value) || 0))}
                  className="backdrop-blur-md bg-white/10 border-white/30 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/90">Total Asistencias</Label>
                <Input
                  type="number"
                  min={0}
                  value={editAssists}
                  onChange={(e) => setEditAssists(Math.max(0, parseInt(e.target.value) || 0))}
                  className="backdrop-blur-md bg-white/10 border-white/30 text-white"
                />
              </div>
            </div>

            <p className="text-xs text-white/50">
              Los cambios se aplicarán como ajuste extemporáneo. Los goles registrados en partidos no serán modificados.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditMode(false)
                setEditingPlayer(null)
              }}
              className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateScorer}
              disabled={savingGoals}
              className="backdrop-blur-md bg-blue-500/80 hover:bg-blue-500/90 text-white border-0"
            >
              {savingGoals ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
