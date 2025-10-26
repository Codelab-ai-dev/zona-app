"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { ArrowLeft, Users, Trophy, AlertTriangle, Target, Clock, IdCard, Printer } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useQRGenerator } from "@/lib/hooks/use-qr-generator"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { PlayerCredential } from "@/components/team-owner/player-credential"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

type Team = Database['public']['Tables']['teams']['Row']
type Player = Database['public']['Tables']['players']['Row']
type PlayerStats = Database['public']['Tables']['player_stats']['Row']
type CoachingStaff = Database['public']['Tables']['coaching_staff']['Row']

interface PlayerWithStats extends Player {
  total_games: number
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_minutes_played: number
}

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { generatePlayerQR } = useQRGenerator()
  const supabase = createClientSupabaseClient()

  const [team, setTeam] = useState<Team | null>(null)
  const [playersWithStats, setPlayersWithStats] = useState<PlayerWithStats[]>([])
  const [coachingStaff, setCoachingStaff] = useState<CoachingStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingQR, setGeneratingQR] = useState(false)
  const [credentialModalOpen, setCredentialModalOpen] = useState(false)
  const [currentCredentialData, setCurrentCredentialData] = useState<{
    player?: PlayerWithStats,
    staff?: CoachingStaff,
    qrData: string
  } | null>(null)
  const [printingAll, setPrintingAll] = useState(false)
  
  const teamId = params?.teamId as string

  useEffect(() => {
    const loadTeamAndStats = async () => {
      if (!teamId) return
      
      try {
        setLoading(true)
        setError(null)
        
        console.log('🔵 Loading team data for ID:', teamId)
        
        // Load team data
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()
        
        if (teamError) {
          console.error('❌ Error loading team:', teamError)
          setError('Equipo no encontrado')
          return
        }
        
        if (!teamData) {
          setError('Equipo no encontrado')
          return
        }
        
        console.log('✅ Team data loaded:', teamData.name)
        setTeam(teamData)
        
        // Load players for this team
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', teamId)
          .eq('is_active', true)
        
        if (playersError) {
          console.error('❌ Error loading players:', playersError)
          setError('Error cargando jugadores')
          return
        }
        
        console.log('✅ Players loaded:', players?.length || 0)
        
        // For each player, get their aggregated stats
        const playersWithStatsData: PlayerWithStats[] = []
        
        for (const player of players || []) {
          const { data: stats, error: statsError } = await supabase
            .from('player_stats')
            .select('*')
            .eq('player_id', player.id)
          
          if (statsError) {
            console.warn('⚠️ Error loading stats for player:', player.name, statsError)
          }
          
          // Calculate aggregated stats
          const totalGames = stats?.length || 0
          const totalGoals = stats?.reduce((sum, s) => sum + (s.goals || 0), 0) || 0
          const totalAssists = stats?.reduce((sum, s) => sum + (s.assists || 0), 0) || 0
          const totalYellowCards = stats?.reduce((sum, s) => sum + (s.yellow_cards || 0), 0) || 0
          const totalRedCards = stats?.reduce((sum, s) => sum + (s.red_cards || 0), 0) || 0
          const totalMinutesPlayed = stats?.reduce((sum, s) => sum + (s.minutes_played || 0), 0) || 0
          
          playersWithStatsData.push({
            ...player,
            total_games: totalGames,
            total_goals: totalGoals,
            total_assists: totalAssists,
            total_yellow_cards: totalYellowCards,
            total_red_cards: totalRedCards,
            total_minutes_played: totalMinutesPlayed,
          })
        }
        
        console.log('✅ Player stats calculated:', playersWithStatsData.length)
        setPlayersWithStats(playersWithStatsData)

        // Load coaching staff for this team
        const { data: coachingStaffData, error: coachingStaffError } = await supabase
          .from('coaching_staff')
          .select('*')
          .eq('team_id', teamId)
          .eq('is_active', true)

        if (coachingStaffError) {
          console.error('❌ Error loading coaching staff:', coachingStaffError)
        } else {
          console.log('✅ Coaching staff loaded:', coachingStaffData?.length || 0)
          setCoachingStaff(coachingStaffData || [])
        }

      } catch (err: any) {
        console.error('❌ Error in loadTeamAndStats:', err)
        setError(err.message || 'Error cargando datos del equipo')
      } finally {
        setLoading(false)
      }
    }

    loadTeamAndStats()
  }, [teamId, supabase])

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleBackClick = () => {
    router.back()
  }

  // Función para generar credencial imprimible
  const handleGenerateCredential = async (player: PlayerWithStats) => {
    setGeneratingQR(true)
    try {
      console.log('🔵 Generando credencial para jugador:', player.name)

      // Usar formato legacy para compatibilidad
      const qrResult = await generatePlayerQR(
        {
          id: player.id,
          name: player.name,
          team_id: player.team_id,
          jersey_number: player.jersey_number
        },
        { format: 'legacy' }
      )

      if (qrResult && qrResult.success) {
        console.log('✅ QR generado exitosamente para credencial')
        setCurrentCredentialData({
          player,
          qrData: qrResult.qrData
        })
        setCredentialModalOpen(true)
      } else {
        toast.error('Error generando credencial')
      }
    } catch (error: any) {
      console.error('❌ Error generando credencial:', error)
      toast.error(`Error generando credencial: ${error.message || 'Error desconocido'}`)
    } finally {
      setGeneratingQR(false)
    }
  }

  // Función para generar credencial de miembro del cuerpo técnico
  const handleGenerateStaffCredential = async (staff: CoachingStaff) => {
    setGeneratingQR(true)
    try {
      console.log('🔵 Generando credencial para cuerpo técnico:', staff.name)

      // Para cuerpo técnico, usamos un formato compacto en el QR
      const qrData = JSON.stringify({
        t: 's', // type: staff
        i: staff.id,
        n: staff.name,
        r: staff.role,
        tm: staff.team_id
      })

      console.log('✅ QR data generado para credencial de cuerpo técnico')
      setCurrentCredentialData({
        staff,
        qrData: qrData
      })
      setCredentialModalOpen(true)
    } catch (error: any) {
      console.error('❌ Error generando credencial:', error)
      toast.error(`Error generando credencial: ${error.message || 'Error desconocido'}`)
    } finally {
      setGeneratingQR(false)
    }
  }

  // Función para imprimir todas las credenciales
  const handlePrintAllCredentials = async () => {
    if (playersWithStats.length === 0 && coachingStaff.length === 0) {
      toast.error('No hay jugadores ni cuerpo técnico para imprimir')
      return
    }

    setPrintingAll(true)
    try {
      console.log('🔵 Generando credenciales para jugadores y cuerpo técnico:', playersWithStats.length, coachingStaff.length)

      // Importar QRCode dinámicamente
      const QRCodeLib = (await import('qrcode')).default

      // Generar QRs como imágenes base64 para todos los jugadores
      const playersWithQR = await Promise.all(
        playersWithStats.map(async (player) => {
          const qrResult = await generatePlayerQR(
            {
              id: player.id,
              name: player.name,
              team_id: player.team_id,
              jersey_number: player.jersey_number
            },
            { format: 'legacy' }
          )

          let qrImageBase64 = ''
          if (qrResult?.success && qrResult.qrData) {
            try {
              // Generar QR como imagen base64
              qrImageBase64 = await QRCodeLib.toDataURL(qrResult.qrData, {
                width: 200,
                margin: 1,
                color: {
                  dark: '#000000',
                  light: '#ffffff'
                }
              })
            } catch (error) {
              console.error('Error generando QR para', player.name, error)
            }
          }

          return {
            type: 'player' as const,
            player,
            qrImageBase64
          }
        })
      )

      // Generar QRs para el cuerpo técnico
      const staffWithQR = await Promise.all(
        coachingStaff.map(async (staff) => {
          // Usar formato compacto para evitar QR codes demasiado grandes
          const qrData = JSON.stringify({
            t: 's', // type: staff
            i: staff.id,
            n: staff.name,
            r: staff.role,
            tm: staff.team_id
          })

          let qrImageBase64 = ''
          try {
            qrImageBase64 = await QRCodeLib.toDataURL(qrData, {
              width: 200,
              margin: 1,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            })
          } catch (error) {
            console.error('Error generando QR para', staff.name, error)
          }

          return {
            type: 'staff' as const,
            staff,
            qrImageBase64
          }
        })
      )

      // Combinar jugadores y cuerpo técnico
      const allCredentials = [...playersWithQR, ...staffWithQR]

      const getPlayerInitials = (name: string) => {
        return name
          .split(" ")
          .map((word) => word[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      }

      // Generar HTML para imprimir todas las credenciales
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('No se pudo abrir ventana de impresión')
      }

      const teamLogoHTML = team?.logo
        ? `<img src="${team.logo}" alt="Logo ${team.name}" class="team-logo" crossorigin="anonymous" />`
        : ''

      const credentialsHTML = allCredentials.map((item) => {
        if (item.type === 'player') {
          const { player, qrImageBase64 } = item
          const photoHTML = player.photo
            ? `<img src="${player.photo}" alt="${player.name}" crossorigin="anonymous" />`
            : `<div class="player-photo-placeholder">${getPlayerInitials(player.name)}</div>`

          const qrHTML = qrImageBase64
            ? `<img src="${qrImageBase64}" width="82" height="82" style="display: block;" alt="QR Code" />`
            : `<div style="width: 82px; height: 82px; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">QR</div>`

          return `
            <div class="credential">
              <div class="header">
                <div class="team-header">
                  ${teamLogoHTML}
                  <h3 class="team-name">${team?.name.toUpperCase()}</h3>
                </div>
              </div>
              <div class="content">
                <div class="player-photo">
                  ${photoHTML}
                </div>
                <div class="player-info">
                  <h4 class="player-name">${player.name}</h4>
                  <p class="player-position">${player.position}</p>
                  <div class="jersey-number">${player.jersey_number}</div>
                </div>
                <div class="qr-container">
                  ${qrHTML}
                </div>
              </div>
              <div class="footer">
                <p class="credential-id">ID: ${player.id.slice(-8).toUpperCase()}</p>
                <p class="valid-text">CREDENCIAL OFICIAL</p>
              </div>
            </div>
          `
        } else {
          // Credencial para cuerpo técnico
          const { staff, qrImageBase64 } = item
          const photoHTML = staff.photo
            ? `<img src="${staff.photo}" alt="${staff.name}" crossorigin="anonymous" />`
            : `<div class="player-photo-placeholder">${getPlayerInitials(staff.name)}</div>`

          const qrHTML = qrImageBase64
            ? `<img src="${qrImageBase64}" width="82" height="82" style="display: block;" alt="QR Code" />`
            : `<div style="width: 82px; height: 82px; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">QR</div>`

          return `
            <div class="credential staff-credential">
              <div class="header">
                <div class="team-header">
                  ${teamLogoHTML}
                  <h3 class="team-name">${team?.name.toUpperCase()}</h3>
                </div>
              </div>
              <div class="content">
                <div class="player-photo">
                  ${photoHTML}
                </div>
                <div class="player-info">
                  <h4 class="player-name">${staff.name}</h4>
                  <p class="player-position">${staff.role}</p>
                  <div class="staff-badge">STAFF</div>
                </div>
                <div class="qr-container">
                  ${qrHTML}
                </div>
              </div>
              <div class="footer">
                <p class="credential-id">ID: ${staff.id.slice(-8).toUpperCase()}</p>
                <p class="valid-text">CUERPO TÉCNICO</p>
              </div>
            </div>
          `
        }
      }).join('')

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Credenciales - ${team?.name}</title>
            <style>
              @page {
                size: A4;
                margin: 10mm;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                background: white;
              }
              .credentials-container {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10mm;
                padding: 10mm;
              }
              .credential {
                width: 85.6mm;
                height: 53.98mm;
                border: 2px solid #0066cc;
                border-radius: 8px;
                padding: 8px;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                break-inside: avoid;
                page-break-inside: avoid;
              }
              .header {
                text-align: center;
                margin-bottom: 4px;
              }
              .team-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                margin-bottom: 2px;
              }
              .team-logo {
                width: 24px;
                height: 24px;
                object-fit: contain;
              }
              .team-name {
                font-size: 14px;
                font-weight: bold;
                color: #0066cc;
                margin: 0;
                line-height: 1;
              }
              .content {
                display: flex;
                align-items: center;
                gap: 6px;
                flex: 1;
                min-height: 90px;
              }
              .player-photo {
                flex-shrink: 0;
                width: 60px;
                height: 75px;
                background: white;
                border: 2px solid #cbd5e1;
                border-radius: 6px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .player-photo img {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }
              .player-photo-placeholder {
                width: 100%;
                height: 100%;
                background: #f1f5f9;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                color: #64748b;
              }
              .player-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                height: 100%;
              }
              .player-name {
                font-size: 16px;
                font-weight: bold;
                color: #1e293b;
                margin: 0 0 4px 0;
                line-height: 1.1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .player-position {
                font-size: 12px;
                color: #64748b;
                margin: 0 0 8px 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-weight: 500;
              }
              .jersey-number {
                font-size: 20px;
                font-weight: bold;
                color: #0066cc;
                background: white;
                border: 3px solid #0066cc;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
                align-self: flex-start;
              }
              .staff-badge {
                font-size: 11px;
                font-weight: bold;
                color: white;
                background: #9333ea;
                border-radius: 12px;
                padding: 4px 12px;
                margin: 0;
                align-self: flex-start;
                letter-spacing: 0.5px;
              }
              .staff-credential {
                border-color: #9333ea;
              }
              .staff-credential .team-name {
                color: #9333ea;
              }
              .qr-container {
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: white;
                border-radius: 6px;
                padding: 4px;
                border: 2px solid #e2e8f0;
                width: 90px;
                height: 90px;
              }
              .footer {
                text-align: center;
                margin-top: 4px;
              }
              .credential-id {
                font-size: 8px;
                color: #64748b;
                margin: 0;
                font-weight: 500;
              }
              .valid-text {
                font-size: 9px;
                color: #0066cc;
                margin: 1px 0 0 0;
                font-weight: bold;
                letter-spacing: 0.5px;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }
                .credentials-container {
                  padding: 10mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="credentials-container">
              ${credentialsHTML}
            </div>
          </body>
        </html>
      `)

      printWindow.document.close()
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
          setPrintingAll(false)
        }, 500)
      }

    } catch (error: any) {
      console.error('❌ Error imprimiendo credenciales:', error)
      toast.error(`Error imprimiendo credenciales: ${error.message || 'Error desconocido'}`)
      setPrintingAll(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Cargando información del equipo... (ID: {teamId})</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-4">Team ID: {teamId}</p>
          <Button onClick={handleBackClick} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Equipo No Encontrado</h2>
          <p className="text-gray-600 mb-4">
            No se pudo cargar la información del equipo.
          </p>
          <Button onClick={handleBackClick} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button onClick={handleBackClick} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            {team.logo ? (
              <AvatarImage src={team.logo} alt={`${team.name} logo`} />
            ) : (
              <AvatarFallback className="bg-green-100 text-green-800 font-bold text-lg">
                {team.name
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
            <p className="text-gray-600">/{team.slug}</p>
            <Badge variant={team.is_active ? "default" : "secondary"} className="mt-1">
              {team.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Team Description */}
      {team.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-700">{team.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{playersWithStats.length}</p>
            <p className="text-sm text-gray-600">Jugadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{coachingStaff.length}</p>
            <p className="text-sm text-gray-600">Cuerpo Técnico</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {playersWithStats.reduce((sum, player) => sum + player.total_goals, 0)}
            </p>
            <p className="text-sm text-gray-600">Goles Totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {playersWithStats.reduce((sum, player) => sum + player.total_yellow_cards, 0)}
            </p>
            <p className="text-sm text-gray-600">Tarjetas Amarillas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {playersWithStats.reduce((sum, player) => sum + player.total_red_cards, 0)}
            </p>
            <p className="text-sm text-gray-600">Tarjetas Rojas</p>
          </CardContent>
        </Card>
      </div>

      {/* Players Statistics Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Estadísticas de Jugadores
              </CardTitle>
              <CardDescription>
                Rendimiento individual de cada jugador del equipo
              </CardDescription>
            </div>
            {playersWithStats.length > 0 && (
              <Button
                onClick={handlePrintAllCredentials}
                disabled={printingAll}
                variant="outline"
                className="text-blue-600 hover:text-blue-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                {printingAll ? 'Generando...' : 'Imprimir Todas las Credenciales'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {playersWithStats.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay jugadores registrados
              </h3>
              <p className="text-gray-600">
                Los jugadores y sus estadísticas aparecerán aquí cuando se registren en el equipo
              </p>
              {team && (
                <p className="text-sm text-gray-500 mt-2">
                  Equipo: {team.name}
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead className="text-center">PJ</TableHead>
                    <TableHead className="text-center">Goles</TableHead>
                    <TableHead className="text-center">Asistencias</TableHead>
                    <TableHead className="text-center">TA</TableHead>
                    <TableHead className="text-center">TR</TableHead>
                    <TableHead className="text-center">Min</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playersWithStats.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            {player.photo ? (
                              <AvatarImage src={player.photo} alt={player.name} />
                            ) : (
                              <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                                {getPlayerInitials(player.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 flex items-center">
                              {player.name}
                              <span className="ml-2 text-sm font-bold text-green-600">
                                #{player.jersey_number}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600">{player.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {player.total_games}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {player.total_goals}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {player.total_assists}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {player.total_yellow_cards > 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            {player.total_yellow_cards}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {player.total_red_cards > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {player.total_red_cards}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        <div className="flex items-center justify-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {player.total_minutes_played}'
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateCredential(player)}
                          disabled={generatingQR}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <IdCard className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coaching Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Cuerpo Técnico
          </CardTitle>
          <CardDescription>
            Miembros del cuerpo técnico del equipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coachingStaff.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay miembros del cuerpo técnico registrados
              </h3>
              <p className="text-gray-600">
                Los miembros del cuerpo técnico aparecerán aquí cuando se registren
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Miembro</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-center">Cédula</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coachingStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            {staff.photo ? (
                              <AvatarImage src={staff.photo} alt={staff.name} />
                            ) : (
                              <AvatarFallback className="bg-purple-100 text-purple-800 text-xs">
                                {getPlayerInitials(staff.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{staff.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {staff.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        {staff.cedula || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateStaffCredential(staff)}
                          disabled={generatingQR}
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <IdCard className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Credencial */}
      {currentCredentialData && team && (
        <PlayerCredential
          open={credentialModalOpen}
          onOpenChange={setCredentialModalOpen}
          player={currentCredentialData.player || currentCredentialData.staff}
          team={{ name: team.name, logo: team.logo }}
          qrData={currentCredentialData.qrData}
        />
      )}
    </div>
  )
}