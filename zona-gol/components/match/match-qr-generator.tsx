"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QrCode, Download, RefreshCw } from 'lucide-react'
import QRCode from 'react-qr-code'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Match {
  id: string
  match_date: string
  match_time: string
  status: string
  home_teams: {
    name: string
  }
  away_teams: {
    name: string
  }
  tournaments: {
    name: string
    leagues: {
      slug: string
    }
  }
}

interface MatchQRGeneratorProps {
  matchId?: string
  showAllMatches?: boolean
}

export function MatchQRGenerator({ matchId, showAllMatches = false }: MatchQRGeneratorProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrData, setQrData] = useState<string>('')
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchMatches()
  }, [])

  useEffect(() => {
    if (matchId && matches.length > 0) {
      const match = matches.find(m => m.id === matchId)
      if (match) {
        setSelectedMatch(match)
        generateQRData(match)
      }
    }
  }, [matchId, matches])

  const fetchMatches = async () => {
    try {
      const now = new Date().toISOString()
      
      let query = supabase
        .from('matches')
        .select(`
          id,
          match_date,
          match_time,
          status,
          home_teams:teams!matches_home_team_id_fkey(name),
          away_teams:teams!matches_away_team_id_fkey(name),
          tournaments!inner(
            name,
            leagues!inner(slug)
          )
        `)
        .in('status', ['scheduled', 'in_progress'])
        .gte('match_date', now.split('T')[0])
        .order('match_date')

      const { data, error } = await query

      if (error) throw error

      setMatches(data || [])
    } catch (error) {
      console.error('Error fetching matches:', error)
      toast.error('Error al cargar partidos')
    } finally {
      setLoading(false)
    }
  }

  const generateQRData = (match: Match) => {
    // Generate QR data that the Flutter app can read
    const qrPayload = {
      type: 'zona_gol_match',
      version: '1.0',
      match_id: match.id,
      match_info: {
        home_team: match.home_teams.name,
        away_team: match.away_teams.name,
        date: match.match_date,
        time: match.match_time || '00:00',
        tournament: match.tournaments.name,
        league_slug: match.tournaments.leagues.slug
      },
      timestamp: new Date().toISOString()
    }
    
    setQrData(JSON.stringify(qrPayload))
  }

  const downloadQR = async (match: Match) => {
    try {
      // Create a canvas to render the QR code
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = 256
      canvas.height = 256

      // Create QR code SVG
      const qrElement = document.getElementById(`qr-${match.id}`)
      if (!qrElement) return

      // Convert SVG to image and download
      const svgData = new XMLSerializer().serializeToString(qrElement.querySelector('svg')!)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `partido-${match.home_teams.name}-vs-${match.away_teams.name}-${match.match_date}.svg`
      link.click()
      
      URL.revokeObjectURL(url)
      toast.success('QR descargado exitosamente')
    } catch (error) {
      console.error('Error downloading QR:', error)
      toast.error('Error al descargar QR')
    }
  }

  const formatDateTime = (date: string, time?: string) => {
    const dateObj = new Date(`${date}T${time || '00:00'}`)
    return {
      date: dateObj.toLocaleDateString('es-ES'),
      time: time ? dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Sin hora'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando partidos...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {showAllMatches && matches.length > 0 && (
        <div className="grid gap-4">
          {matches.map((match) => {
            const { date, time } = formatDateTime(match.match_date, match.match_time)
            return (
              <Card key={match.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {match.home_teams.name} vs {match.away_teams.name}
                    </CardTitle>
                    <Badge variant={match.status === 'in_progress' ? 'default' : 'secondary'}>
                      {match.status === 'in_progress' ? 'En Curso' : 'Programado'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {match.tournaments.name} • {date} • {time}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center space-y-2">
                      <div id={`qr-${match.id}`}>
                        <QRCode
                          size={120}
                          value={JSON.stringify({
                            type: 'zona_gol_match',
                            version: '1.0',
                            match_id: match.id,
                            match_info: {
                              home_team: match.home_teams.name,
                              away_team: match.away_teams.name,
                              date: match.match_date,
                              time: match.match_time || '00:00',
                              tournament: match.tournaments.name,
                              league_slug: match.tournaments.leagues.slug
                            },
                            timestamp: new Date().toISOString()
                          })}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadQR(match)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar QR
                      </Button>
                    </div>
                    <div className="flex-1 ml-6">
                      <h4 className="font-medium mb-2">Código QR para App Flutter</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Escanea este código con la app de reconocimiento facial para seleccionar este partido.
                      </p>
                      <div className="text-xs bg-muted p-2 rounded font-mono">
                        ID: {match.id}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selectedMatch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Código QR del Partido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              {qrData && (
                <div className="space-y-4 text-center">
                  <QRCode size={256} value={qrData} />
                  <div>
                    <h3 className="font-medium">
                      {selectedMatch.home_teams.name} vs {selectedMatch.away_teams.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(selectedMatch.match_date, selectedMatch.match_time).date} • 
                      {formatDateTime(selectedMatch.match_date, selectedMatch.match_time).time}
                    </p>
                  </div>
                  <Button onClick={() => downloadQR(selectedMatch)}>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar QR
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {matches.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <QrCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No hay partidos programados</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}