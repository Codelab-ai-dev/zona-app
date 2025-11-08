"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Ban, Plus, CheckCircle, XCircle, Loader2, AlertTriangle, Pencil } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Suspension {
  id: string
  player_id: string
  player_name: string
  jersey_number: number
  team_name: string
  suspension_type: string
  reason: string
  matches_to_serve: number
  matches_served: number
  status: string
  created_at: string
}

interface Player {
  id: string
  name: string
  jersey_number: number
  team_id: string
  team_name: string
}

interface SuspensionsManagementProps {
  leagueId: string
}

export function SuspensionsManagement({ leagueId }: SuspensionsManagementProps) {
  const [suspensions, setSuspensions] = useState<Suspension[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<string>("")
  const [suspensionType, setSuspensionType] = useState<string>("disciplinary_committee")
  const [reason, setReason] = useState("")
  const [matchesToServe, setMatchesToServe] = useState(1)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingSuspension, setEditingSuspension] = useState<Suspension | null>(null)
  const [editMatchesToServe, setEditMatchesToServe] = useState(1)

  const supabase = createClientSupabaseClient()

  useEffect(() => {
    loadData()
  }, [leagueId])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadSuspensions(), loadPlayers()])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSuspensions = async () => {
    const { data, error } = await supabase
      .from('player_suspensions')
      .select(`
        id,
        player_id,
        suspension_type,
        reason,
        matches_to_serve,
        matches_served,
        status,
        created_at,
        player:players(
          name,
          jersey_number,
          team:teams(name)
        )
      `)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading suspensions:', error)
      return
    }

    const formattedSuspensions = data?.map((s: any) => ({
      id: s.id,
      player_id: s.player_id,
      player_name: s.player?.name || 'Desconocido',
      jersey_number: s.player?.jersey_number || 0,
      team_name: s.player?.team?.name || 'Sin equipo',
      suspension_type: s.suspension_type,
      reason: s.reason,
      matches_to_serve: s.matches_to_serve,
      matches_served: s.matches_served,
      status: s.status,
      created_at: s.created_at,
    })) || []

    setSuspensions(formattedSuspensions)
  }

  const loadPlayers = async () => {
    // Get all players from teams in this league
    const { data, error } = await supabase
      .from('players')
      .select(`
        id,
        name,
        jersey_number,
        team_id,
        team:teams!inner(
          name,
          league_id
        )
      `)
      .eq('team.league_id', leagueId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error loading players:', error)
      return
    }

    const formattedPlayers = data?.map((p: any) => ({
      id: p.id,
      name: p.name,
      jersey_number: p.jersey_number,
      team_id: p.team_id,
      team_name: p.team?.name || 'Sin equipo',
    })) || []

    setPlayers(formattedPlayers)
  }

  const handleCreateSuspension = async () => {
    if (!selectedPlayer || !reason) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    setCreating(true)
    try {
      const player = players.find(p => p.id === selectedPlayer)
      if (!player) return

      const { error } = await supabase
        .from('player_suspensions')
        .insert({
          player_id: selectedPlayer,
          team_id: player.team_id,
          league_id: leagueId,
          suspension_type: suspensionType,
          reason: reason,
          matches_to_serve: matchesToServe,
          status: 'active',
        } as any)

      if (error) {
        console.error('Error creating suspension:', error)
        toast.error('Error al crear la suspensión')
        return
      }

      // Reset form
      setSelectedPlayer("")
      setReason("")
      setMatchesToServe(1)
      setSuspensionType("disciplinary_committee")
      setCreateDialogOpen(false)
      toast.success('Suspensión creada exitosamente')

      // Reload data
      await loadSuspensions()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al crear la suspensión')
    } finally {
      setCreating(false)
    }
  }

  const handleCancelSuspension = async (suspensionId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta suspensión?')) return

    try {
      const { error } = await (supabase
        .from('player_suspensions') as any)
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', suspensionId)

      if (error) {
        console.error('Error cancelling suspension:', error)
        toast.error('Error al cancelar la suspensión')
        return
      }

      toast.success('Suspensión cancelada exitosamente')
      await loadSuspensions()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cancelar la suspensión')
    }
  }

  const handleCompleteSuspension = async (suspensionId: string) => {
    if (!confirm('¿Marcar esta suspensión como completada?')) return

    try {
      // First, get the suspension to know matches_to_serve
      const { data: suspension, error: fetchError } = await supabase
        .from('player_suspensions')
        .select('matches_to_serve')
        .eq('id', suspensionId)
        .single()

      if (fetchError || !suspension) {
        console.error('Error fetching suspension:', fetchError)
        toast.error('Error al obtener la suspensión')
        return
      }

      // Update the suspension to completed
      const { error } = await (supabase
        .from('player_suspensions') as any)
        .update({
          status: 'completed',
          matches_served: (suspension as any).matches_to_serve, // Set served to total to complete
          updated_at: new Date().toISOString()
        })
        .eq('id', suspensionId)

      if (error) {
        console.error('Error completing suspension:', error)
        toast.error('Error al completar la suspensión')
        return
      }

      toast.success('Suspensión completada exitosamente')
      await loadSuspensions()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al completar la suspensión')
    }
  }

  const handleOpenEditDialog = (suspension: Suspension) => {
    setEditingSuspension(suspension)
    setEditMatchesToServe(suspension.matches_to_serve)
    setEditDialogOpen(true)
  }

  const handleUpdateSuspension = async () => {
    if (!editingSuspension) return

    if (editMatchesToServe < 1) {
      toast.error('El número de partidos debe ser al menos 1')
      return
    }

    setEditing(true)
    try {
      const { error } = await (supabase
        .from('player_suspensions') as any)
        .update({
          matches_to_serve: editMatchesToServe,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSuspension.id)

      if (error) {
        console.error('Error updating suspension:', error)
        toast.error('Error al actualizar la suspensión')
        return
      }

      toast.success('Suspensión actualizada exitosamente')
      setEditDialogOpen(false)
      setEditingSuspension(null)
      await loadSuspensions()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar la suspensión')
    } finally {
      setEditing(false)
    }
  }

  const getSuspensionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      red_card: 'Tarjeta Roja',
      yellow_accumulation: 'Acumulación Amarillas',
      disciplinary_committee: 'Comité Disciplinario',
      other: 'Otro',
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="backdrop-blur-md bg-red-500/80 text-white border-0">Activa</Badge>
    }
    if (status === 'completed') {
      return <Badge className="backdrop-blur-md bg-gray-500/80 text-white border-0">Completada</Badge>
    }
    return <Badge className="backdrop-blur-md bg-white/10 text-white border-white/30">Cancelada</Badge>
  }

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
                <Ban className="w-5 h-5 text-red-300" />
                Gestión de Suspensiones
              </CardTitle>
              <CardDescription className="text-white/80 drop-shadow">
                Administra las suspensiones de jugadores por tarjetas o decisiones disciplinarias
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Suspensión
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-3 text-white" />
              <span className="text-white drop-shadow">Cargando suspensiones...</span>
            </div>
          ) : suspensions.length === 0 ? (
            <div className="text-center py-12">
              <Ban className="w-12 h-12 mx-auto text-white/50 mb-4" />
              <h3 className="text-lg font-medium text-white drop-shadow-lg mb-2">
                No hay suspensiones registradas
              </h3>
              <p className="text-white/80 drop-shadow mb-4">
                No se han registrado suspensiones en esta liga.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Suspensión
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-white/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-white/5">
                    <TableHead className="text-white/90">Jugador</TableHead>
                    <TableHead className="text-white/90">Equipo</TableHead>
                    <TableHead className="text-white/90">Tipo</TableHead>
                    <TableHead className="text-white/90">Motivo</TableHead>
                    <TableHead className="text-center text-white/90">Partidos</TableHead>
                    <TableHead className="text-white/90">Estado</TableHead>
                    <TableHead className="text-right text-white/90">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspensions.map((suspension) => (
                    <TableRow key={suspension.id} className="border-white/20 hover:bg-white/5">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-white drop-shadow">{suspension.player_name}</span>
                          <Badge className="backdrop-blur-md bg-white/10 text-white border-white/30">
                            #{suspension.jersey_number}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/80 drop-shadow">
                        {suspension.team_name}
                      </TableCell>
                      <TableCell>
                        <Badge className="backdrop-blur-md bg-blue-500/80 text-white border-0">
                          {getSuspensionTypeLabel(suspension.suspension_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-white/80 drop-shadow">
                        {suspension.reason}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-white drop-shadow">
                          {suspension.matches_served} / {suspension.matches_to_serve}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(suspension.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {suspension.status === 'active' && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleOpenEditDialog(suspension)}
                              className="backdrop-blur-md bg-blue-500/80 hover:bg-blue-500/90 text-white border-0"
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleCompleteSuspension(suspension.id)}
                              className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Completar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleCancelSuspension(suspension.id)}
                              className="backdrop-blur-md bg-red-500/80 hover:bg-red-500/90 text-white border-0"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Suspension Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl backdrop-blur-xl bg-gray-700/95 border-white/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white drop-shadow-lg">Nueva Suspensión</DialogTitle>
            <DialogDescription className="text-white/80 drop-shadow">
              Crea una suspensión para un jugador por decisión disciplinaria
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player" className="text-white/90 drop-shadow">Jugador *</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg">
                  <SelectValue placeholder="Selecciona un jugador" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id} className="text-white hover:bg-white/10">
                      {player.name} (#{player.jersey_number}) - {player.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-white/90 drop-shadow">Tipo de Suspensión *</Label>
              <Select value={suspensionType} onValueChange={setSuspensionType}>
                <SelectTrigger className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-gray-700/95 border-white/20">
                  <SelectItem value="disciplinary_committee" className="text-white hover:bg-white/10">Comité Disciplinario</SelectItem>
                  <SelectItem value="yellow_accumulation" className="text-white hover:bg-white/10">Acumulación de Amarillas</SelectItem>
                  <SelectItem value="red_card" className="text-white hover:bg-white/10">Tarjeta Roja</SelectItem>
                  <SelectItem value="other" className="text-white hover:bg-white/10">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-white/90 drop-shadow">Motivo *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe el motivo de la suspensión..."
                rows={3}
                className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="matches" className="text-white/90 drop-shadow">Número de Partidos a Cumplir *</Label>
              <Input
                id="matches"
                type="number"
                min={1}
                max={20}
                value={matchesToServe}
                onChange={(e) => setMatchesToServe(parseInt(e.target.value) || 1)}
                className="backdrop-blur-md bg-white/10 border-white/30 text-white rounded-lg"
              />
            </div>

            <div className="p-4 backdrop-blur-xl bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
              <div className="flex gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-300 flex-shrink-0" />
                <div className="text-sm text-white drop-shadow">
                  <p className="font-medium">Nota importante:</p>
                  <p className="mt-1">
                    El jugador no podrá registrar asistencia en los próximos {matchesToServe} partido(s) de su equipo.
                    La suspensión se aplicará automáticamente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCreateDialogOpen(false)} className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20">
              Cancelar
            </Button>
            <Button onClick={handleCreateSuspension} disabled={creating} className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg">
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Suspensión'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Suspension Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Suspensión</DialogTitle>
            <DialogDescription>
              Modifica el número de partidos de suspensión
            </DialogDescription>
          </DialogHeader>

          {editingSuspension && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Jugador:</span>
                    <span className="font-medium">
                      {editingSuspension.player_name}
                      <Badge variant="outline" className="ml-2">
                        #{editingSuspension.jersey_number}
                      </Badge>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Equipo:</span>
                    <span className="font-medium">{editingSuspension.team_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tipo:</span>
                    <Badge variant="secondary">
                      {getSuspensionTypeLabel(editingSuspension.suspension_type)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Partidos cumplidos:</span>
                    <span className="font-medium">{editingSuspension.matches_served}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-matches">Número de Partidos a Cumplir *</Label>
                <Input
                  id="edit-matches"
                  type="number"
                  min={1}
                  max={20}
                  value={editMatchesToServe}
                  onChange={(e) => setEditMatchesToServe(parseInt(e.target.value) || 1)}
                />
                <p className="text-sm text-muted-foreground">
                  Partidos restantes: {Math.max(0, editMatchesToServe - editingSuspension.matches_served)}
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Nota:</p>
                    <p className="mt-1">
                      Al modificar el número de partidos, se actualizará el total de partidos a cumplir.
                      Los partidos ya cumplidos ({editingSuspension.matches_served}) no se modificarán.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateSuspension} disabled={editing}>
              {editing ? (
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
