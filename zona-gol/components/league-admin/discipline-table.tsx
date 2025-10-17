"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { AlertTriangle, Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DisciplineRecord {
  player_id: string
  player_name: string
  jersey_number: number
  team_name: string
  team_id: string
  yellow_cards: number
  red_cards: number
  total_cards: number
  is_suspended: boolean
  suspension_reason?: string
}

interface DisciplineTableProps {
  leagueId: string
}

export function DisciplineTable({ leagueId }: DisciplineTableProps) {
  const [disciplineRecords, setDisciplineRecords] = useState<DisciplineRecord[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    loadDisciplineData()
  }, [leagueId])

  const loadDisciplineData = async () => {
    setLoading(true)
    try {
      // Get all cards from matches in tournaments of this league
      const { data: cardsData, error: cardsError } = await supabase
        .from('match_cards')
        .select(`
          id,
          player_id,
          card_type,
          match_id,
          player:players(
            id,
            name,
            jersey_number,
            team:teams(
              id,
              name
            )
          ),
          match:matches(
            id,
            tournament:tournaments(
              id,
              league_id
            )
          )
        `)

      if (cardsError) {
        console.error('Error loading discipline data:', cardsError)
        return
      }

      // Get active suspensions for this league
      const { data: suspensionsData } = await supabase
        .from('player_suspensions')
        .select('player_id, reason, matches_to_serve, matches_served')
        .eq('league_id', leagueId)
        .eq('status', 'active')

      const suspensionsMap = new Map<string, { reason: string; remaining: number }>()
      suspensionsData?.forEach(s => {
        const remaining = s.matches_to_serve - s.matches_served
        if (remaining > 0) {
          suspensionsMap.set(s.player_id, {
            reason: s.reason,
            remaining
          })
        }
      })

      // Filter by league and aggregate by player
      const playerCardsMap = new Map<string, DisciplineRecord>()

      cardsData?.forEach((card: any) => {
        // Check if this card belongs to a match in this league
        if (card.match?.tournament?.league_id !== leagueId) {
          return
        }

        const playerId = card.player_id
        const playerName = card.player?.name || 'Desconocido'
        const jerseyNumber = card.player?.jersey_number || 0
        const teamName = card.player?.team?.name || 'Sin equipo'
        const teamId = card.player?.team?.id || ''
        const isYellow = card.card_type === 'yellow'
        const isRed = card.card_type === 'red'

        if (!playerCardsMap.has(playerId)) {
          const suspension = suspensionsMap.get(playerId)
          playerCardsMap.set(playerId, {
            player_id: playerId,
            player_name: playerName,
            jersey_number: jerseyNumber,
            team_name: teamName,
            team_id: teamId,
            yellow_cards: 0,
            red_cards: 0,
            total_cards: 0,
            is_suspended: !!suspension,
            suspension_reason: suspension?.reason,
          })
        }

        const record = playerCardsMap.get(playerId)!
        if (isYellow) record.yellow_cards++
        if (isRed) record.red_cards++
        record.total_cards++
      })

      // Convert map to array and sort by total cards (descending)
      const records = Array.from(playerCardsMap.values()).sort(
        (a, b) => b.total_cards - a.total_cards
      )

      setDisciplineRecords(records)
    } catch (error) {
      console.error('Error loading discipline data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Tabla de Disciplina
        </CardTitle>
        <CardDescription>
          Registro de tarjetas amarillas y rojas de todos los jugadores
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span>Cargando datos disciplinarios...</span>
          </div>
        ) : disciplineRecords.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay registros disciplinarios
            </h3>
            <p className="text-gray-500">
              No se han registrado tarjetas en partidos de esta liga.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead className="text-center">Dorsal</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-4 h-6 bg-yellow-400 border border-yellow-500 rounded-sm"></div>
                      Amarillas
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-4 h-6 bg-red-500 border border-red-600 rounded-sm"></div>
                      Rojas
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disciplineRecords.map((record, index) => (
                  <TableRow key={record.player_id} className={record.is_suspended ? 'bg-red-50' : ''}>
                    <TableCell className="text-center font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {record.player_name}
                        {record.is_suspended && (
                          <Badge variant="destructive" className="text-xs">
                            SUSPENDIDO
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {record.team_name}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{record.jersey_number}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {record.yellow_cards > 0 ? (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          {record.yellow_cards}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {record.red_cards > 0 ? (
                        <Badge className="bg-red-100 text-red-800 border-red-300">
                          {record.red_cards}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold">
                        {record.total_cards}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.is_suspended ? (
                        <div className="text-sm">
                          <Badge variant="destructive">Suspendido</Badge>
                          {record.suspension_reason && (
                            <p className="text-xs text-gray-600 mt-1">
                              {record.suspension_reason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          Habilitado
                        </Badge>
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
  )
}
