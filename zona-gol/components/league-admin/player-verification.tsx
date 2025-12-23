"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/hooks/use-auth"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import {
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  ShieldCheck,
  AlertCircle,
  Users,
  CreditCard,
} from "lucide-react"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { calculateAge, parseDate } from "@/lib/utils/age-utils"

interface PlayerVerificationProps {
  leagueId: string
}

interface PlayerWithTeam {
  id: string
  name: string
  birth_date: string | null
  id_document_url: string | null
  id_verified: boolean
  id_verified_at: string | null
  id_verified_by: string | null
  id_verification_method: 'automatic' | 'manual' | null
  extracted_name: string | null
  extracted_curp: string | null
  team: {
    id: string
    name: string
    logo: string | null
    tournament: {
      id: string
      name: string
      age_validation_enabled: boolean
      min_age: number | null
      max_age: number | null
    } | null
  }
}

export function PlayerVerification({ leagueId }: PlayerVerificationProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const supabase = createClientSupabaseClient()

  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'unverified'>('pending')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithTeam | null>(null)
  const [viewingDocument, setViewingDocument] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<PlayerWithTeam | null>(null)
  const [editBirthDate, setEditBirthDate] = useState("")

  // Fetch players with verification info
  const { data: players = [], isLoading, error } = useQuery({
    queryKey: ['player-verification', leagueId],
    queryFn: async () => {
      // First get teams for this league
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('league_id', leagueId)

      if (teamsError) throw teamsError

      const teamIds = teamsData?.map(t => t.id) || []
      if (teamIds.length === 0) return []

      // Then get players from those teams
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          name,
          birth_date,
          id_document_url,
          id_verified,
          id_verified_at,
          id_verified_by,
          id_verification_method,
          extracted_name,
          extracted_curp,
          created_at,
          team_id
        `)
        .in('team_id', teamIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get team details
      const { data: teams, error: teamDetailsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          logo,
          league_id,
          tournament_id
        `)
        .in('id', teamIds)

      if (teamDetailsError) throw teamDetailsError

      // Get tournament details
      const tournamentIds = [...new Set(teams?.map(t => t.tournament_id).filter(Boolean) || [])]
      let tournamentsMap: Record<string, any> = {}

      if (tournamentIds.length > 0) {
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select(`
            id,
            name,
            age_validation_enabled,
            min_age,
            max_age
          `)
          .in('id', tournamentIds)

        tournamentsMap = (tournaments || []).reduce((acc, t) => {
          acc[t.id] = t
          return acc
        }, {} as Record<string, any>)
      }

      // Build teams map
      const teamsMap = (teams || []).reduce((acc, team) => {
        acc[team.id] = {
          ...team,
          tournament: team.tournament_id ? tournamentsMap[team.tournament_id] || null : null,
        }
        return acc
      }, {} as Record<string, any>)

      // Transform data
      return (data || []).map((player: any) => ({
        ...player,
        team: teamsMap[player.team_id] || { id: player.team_id, name: 'Desconocido', logo: null, tournament: null },
      })) as PlayerWithTeam[]
    },
    enabled: !!leagueId,
  })

  // Verify player mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ playerId, verified }: { playerId: string; verified: boolean }) => {
      const { error } = await supabase
        .from('players')
        .update({
          id_verified: verified,
          id_verified_at: verified ? new Date().toISOString() : null,
          id_verified_by: verified ? profile?.id : null,
          id_verification_method: verified ? 'manual' : null,
        })
        .eq('id', playerId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-verification', leagueId] })
      toast.success('Estado de verificación actualizado')
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  // Update birth date mutation
  const updateBirthDateMutation = useMutation({
    mutationFn: async ({ playerId, birthDate }: { playerId: string; birthDate: string }) => {
      const { error } = await supabase
        .from('players')
        .update({
          birth_date: birthDate,
          id_verified: true,
          id_verified_at: new Date().toISOString(),
          id_verified_by: profile?.id,
          id_verification_method: 'manual',
        })
        .eq('id', playerId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-verification', leagueId] })
      setEditingPlayer(null)
      toast.success('Fecha de nacimiento actualizada y verificada')
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  // Filter players based on selection
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      // Only show players from tournaments with age validation enabled
      if (!player.team.tournament?.age_validation_enabled) return false

      switch (filter) {
        case 'pending':
          return player.id_document_url && !player.id_verified
        case 'verified':
          return player.id_verified
        case 'unverified':
          return !player.id_verified && !player.id_document_url
        default:
          return true
      }
    })
  }, [players, filter])

  // Stats
  const stats = useMemo(() => {
    const withAgeValidation = players.filter(p => p.team.tournament?.age_validation_enabled)
    return {
      total: withAgeValidation.length,
      pending: withAgeValidation.filter(p => p.id_document_url && !p.id_verified).length,
      verified: withAgeValidation.filter(p => p.id_verified).length,
      unverified: withAgeValidation.filter(p => !p.id_verified && !p.id_document_url).length,
    }
  }, [players])

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleVerify = (playerId: string, verified: boolean) => {
    verifyMutation.mutate({ playerId, verified })
  }

  const handleEditBirthDate = (player: PlayerWithTeam) => {
    setEditingPlayer(player)
    setEditBirthDate(player.birth_date || "")
  }

  const handleSaveBirthDate = () => {
    if (!editingPlayer || !editBirthDate) return
    updateBirthDateMutation.mutate({
      playerId: editingPlayer.id,
      birthDate: editBirthDate,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Verificación de Jugadores</h2>
          <p className="text-white/80 drop-shadow">Revisa y verifica los documentos de identidad</p>
        </div>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3 text-white" />
            <span className="text-base sm:text-lg text-white drop-shadow">Cargando jugadores...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Verificación de Jugadores</h2>
          <p className="text-white/80 drop-shadow">Revisa y verifica los documentos de identidad</p>
        </div>
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-400 mb-4" />
            <p className="text-white/80 drop-shadow">Error al cargar los jugadores</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Verificación de Jugadores</h2>
        <p className="text-white/80 drop-shadow">Revisa y verifica los documentos de identidad</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="pt-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-white/70" />
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-white/70">Total</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-yellow-500/20 border-yellow-400/30 shadow-xl">
          <CardContent className="pt-4 text-center">
            <CreditCard className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            <p className="text-xs text-yellow-300">Pendientes</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-green-500/20 border-green-400/30 shadow-xl">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p className="text-2xl font-bold text-green-400">{stats.verified}</p>
            <p className="text-xs text-green-300">Verificados</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-red-500/20 border-red-400/30 shadow-xl">
          <CardContent className="pt-4 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-red-400" />
            <p className="text-2xl font-bold text-red-400">{stats.unverified}</p>
            <p className="text-xs text-red-300">Sin INE</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              Lista de Jugadores
            </CardTitle>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-800/50 border-white/10 text-white">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes de verificar</SelectItem>
                <SelectItem value="verified">Verificados</SelectItem>
                <SelectItem value="unverified">Sin INE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="w-12 h-12 mx-auto text-white/40 mb-4" />
              <p className="text-white/60">No hay jugadores en esta categoría</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/90">Jugador</TableHead>
                    <TableHead className="text-white/90">Equipo</TableHead>
                    <TableHead className="text-white/90">Edad</TableHead>
                    <TableHead className="text-white/90">Estado</TableHead>
                    <TableHead className="text-white/90 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => {
                    const age = player.birth_date
                      ? calculateAge(parseDate(player.birth_date), new Date())
                      : null
                    const meetsAge = age !== null && player.team.tournament
                      ? (player.team.tournament.min_age === null || age >= player.team.tournament.min_age) &&
                        (player.team.tournament.max_age === null || age <= player.team.tournament.max_age)
                      : true

                    return (
                      <TableRow key={player.id} className="border-white/10 hover:bg-white/5">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-white/20">
                              <AvatarFallback className="bg-slate-700 text-white text-xs">
                                {getPlayerInitials(player.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-white">{player.name}</p>
                              {player.extracted_name && player.extracted_name !== player.name && (
                                <p className="text-xs text-yellow-400">
                                  INE: {player.extracted_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6 border border-white/20">
                              {player.team.logo ? (
                                <AvatarImage src={player.team.logo} alt={player.team.name} />
                              ) : null}
                              <AvatarFallback className="bg-slate-700 text-white text-xs">
                                {player.team.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white/80 text-sm">{player.team.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {age !== null ? (
                            <Badge className={meetsAge
                              ? "bg-green-500/80 text-white border-0"
                              : "bg-red-500/80 text-white border-0"
                            }>
                              {age} años
                            </Badge>
                          ) : (
                            <span className="text-white/50">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {player.id_verified ? (
                            <Badge className="bg-green-500/80 text-white border-0 flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3 h-3" />
                              Verificado
                            </Badge>
                          ) : player.id_document_url ? (
                            <Badge className="bg-yellow-500/80 text-white border-0 flex items-center gap-1 w-fit">
                              <CreditCard className="w-3 h-3" />
                              Pendiente
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-500/80 text-white border-0 w-fit">
                              Sin INE
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {player.id_document_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                                onClick={() => {
                                  setSelectedPlayer(player)
                                  setViewingDocument(true)
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                              onClick={() => handleEditBirthDate(player)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {!player.id_verified && player.id_document_url && (
                              <Button
                                size="sm"
                                className="bg-green-500/80 hover:bg-green-500/90 text-white border-0"
                                onClick={() => handleVerify(player.id, true)}
                                disabled={verifyMutation.isPending}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            {player.id_verified && (
                              <Button
                                size="sm"
                                className="bg-red-500/80 hover:bg-red-500/90 text-white border-0"
                                onClick={() => handleVerify(player.id, false)}
                                disabled={verifyMutation.isPending}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
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

      {/* View Document Dialog */}
      <Dialog open={viewingDocument} onOpenChange={setViewingDocument}>
        <DialogContent className="max-w-2xl bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              Documento de Identidad
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {selectedPlayer?.name} - {selectedPlayer?.team.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPlayer?.id_document_url && (
              <div className="relative rounded-lg overflow-hidden border border-white/20">
                <img
                  src={selectedPlayer.id_document_url}
                  alt="INE"
                  className="w-full h-auto max-h-96 object-contain bg-black/50"
                />
              </div>
            )}

            {selectedPlayer?.extracted_name && (
              <div className="p-4 rounded-lg bg-slate-800/50 border border-white/10 space-y-2">
                <h4 className="font-medium text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  Datos Extraídos
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/60">Nombre</p>
                    <p className="text-white">{selectedPlayer.extracted_name}</p>
                  </div>
                  <div>
                    <p className="text-white/60">CURP</p>
                    <p className="text-white font-mono">{selectedPlayer.extracted_curp || '-'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Fecha de Nacimiento</p>
                    <p className="text-white">{selectedPlayer.birth_date || '-'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Edad Calculada</p>
                    <p className="text-white">
                      {selectedPlayer.birth_date
                        ? `${calculateAge(parseDate(selectedPlayer.birth_date), new Date())} años`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              {selectedPlayer && !selectedPlayer.id_verified && (
                <Button
                  className="bg-green-500/80 hover:bg-green-500/90 text-white border-0"
                  onClick={() => {
                    handleVerify(selectedPlayer.id, true)
                    setViewingDocument(false)
                  }}
                  disabled={verifyMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprobar Verificación
                </Button>
              )}
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => setViewingDocument(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Birth Date Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-400" />
              Editar Fecha de Nacimiento
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {editingPlayer?.name} - Esto marcará al jugador como verificado manualmente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="birthDate" className="text-white">Fecha de Nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => setEditingPlayer(null)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-green-500/80 hover:bg-green-500/90 text-white border-0"
                onClick={handleSaveBirthDate}
                disabled={!editBirthDate || updateBirthDateMutation.isPending}
              >
                {updateBirthDateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Guardar y Verificar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
