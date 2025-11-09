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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Users, Trophy, AlertTriangle, Target, Clock, Loader2, IdCard, Printer } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useQRGenerator } from "@/lib/hooks/use-qr-generator"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { PlayerCredential } from "@/components/team-owner/player-credential"
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
  const [isLeagueAdmin, setIsLeagueAdmin] = useState(false)
  const [leagueLogo, setLeagueLogo] = useState<string>('')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithStats | null>(null)
  const [playerModalOpen, setPlayerModalOpen] = useState(false)

  const teamId = params?.teamId as string

  useEffect(() => {
    const checkLeagueAdmin = async () => {
      if (!user || !team) return

      try {
        const { data: league } = await supabase
          .from('leagues')
          .select('admin_id')
          .eq('id', team.league_id)
          .single() as { data: { admin_id: string } | null }

        setIsLeagueAdmin(league?.admin_id === user.id)
      } catch (error) {
        console.error('Error checking league admin:', error)
      }
    }

    checkLeagueAdmin()
  }, [user, team, supabase])

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
          .single() as { data: Team | null, error: any }
        
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

        // Load league logo
        if (teamData.league_id) {
          const { data: league } = await supabase
            .from('leagues')
            .select('logo')
            .eq('id', teamData.league_id)
            .single() as { data: { logo: string | null } | null }

          if (league?.logo) {
            setLeagueLogo(league.logo)
            console.log('✅ League logo loaded')
          }
        }

        // Load players for this team
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', teamId)
          .eq('is_active', true) as { data: Player[] | null, error: any }
        
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
            .eq('player_id', player.id) as { data: PlayerStats[] | null, error: any }
          
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
        console.log('🔵 Loading coaching staff for team ID:', teamId)
        const { data: coachingStaffData, error: coachingStaffError } = await supabase
          .from('coaching_staff')
          .select('*')
          .eq('team_id', teamId)
          .eq('is_active', true)

        if (coachingStaffError) {
          console.error('❌ Error loading coaching staff:', coachingStaffError)
          // No bloqueamos la carga por error en cuerpo técnico
        }

        console.log('✅ Coaching staff loaded:', coachingStaffData?.length || 0, coachingStaffData)
        setCoachingStaff(coachingStaffData || [])

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

  const handlePlayerClick = (player: PlayerWithStats) => {
    setSelectedPlayer(player)
    setPlayerModalOpen(true)
  }

  // Función para generar credencial imprimible
  const handleGenerateCredential = async (player: PlayerWithStats) => {
    setGeneratingQR(true)
    try {
      console.log('🔵 Generando credencial para jugador:', player.name)

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

      const qrData = JSON.stringify({
        t: 's',
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

      // Obtener información de la liga para el logo
      let leagueLogo = ''
      if (team?.league_id) {
        try {
          const { data: league } = await supabase
            .from('leagues')
            .select('logo')
            .eq('id', team.league_id)
            .single() as { data: { logo: string | null } | null }

          leagueLogo = league?.logo || ''
          console.log('✅ Logo de liga obtenido:', leagueLogo)
        } catch (error) {
          console.warn('⚠️ No se pudo obtener logo de liga:', error)
        }
      }

      const QRCodeLib = (await import('qrcode')).default

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

      const staffWithQR = await Promise.all(
        coachingStaff.map(async (staff) => {
          const qrData = JSON.stringify({
            t: 's',
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

      const allCredentials = [...playersWithQR, ...staffWithQR]

      const getPlayerInitials = (name: string) => {
        return name
          .split(" ")
          .map((word) => word[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      }

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
                position: relative;
                overflow: hidden;
              }
              .credential::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 120px;
                height: 120px;
                background-image: url('${leagueLogo}');
                background-size: contain;
                background-position: center;
                background-repeat: no-repeat;
                opacity: 0.08;
                z-index: 0;
                pointer-events: none;
              }
              .credential > * {
                position: relative;
                z-index: 1;
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
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20">
            <Loader2 className="w-8 h-8 animate-spin mr-2 text-white" />
            <span className="text-white drop-shadow">Cargando información del equipo... (ID: {teamId})</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">Error</h2>
            <p className="text-red-300 mb-4 drop-shadow">{error}</p>
            <p className="text-sm text-white/70 mb-4 drop-shadow">Team ID: {teamId}</p>
            <Button onClick={handleBackClick} className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">Equipo No Encontrado</h2>
            <p className="text-white/80 mb-4 drop-shadow">
              No se pudo cargar la información del equipo.
            </p>
            <Button onClick={handleBackClick} className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20 shadow-xl">
          <div className="flex items-center space-x-4">
            <Button onClick={handleBackClick} size="sm" className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16 border-2 border-white/30">
                {team.logo ? (
                  <AvatarImage src={team.logo} alt={`${team.name} logo`} />
                ) : (
                  <AvatarFallback className="backdrop-blur-md bg-green-500/80 text-white font-bold text-lg">
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
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">{team.name}</h1>
                <p className="text-white/70 drop-shadow">/{team.slug}</p>
                <Badge className={`mt-1 backdrop-blur-md border-0 ${team.is_active ? 'bg-green-500/80 text-white' : 'bg-gray-500/80 text-white'}`}>
                  {team.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Team Description */}
        {team.description && (
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardContent className="pt-6">
              <p className="text-white/90 drop-shadow">{team.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Statistics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 text-blue-300 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white drop-shadow-lg">{playersWithStats.length}</p>
              <p className="text-sm text-white/70 drop-shadow">Jugadores</p>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 text-purple-300 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white drop-shadow-lg">{coachingStaff.length}</p>
              <p className="text-sm text-white/70 drop-shadow">Cuerpo Técnico</p>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardContent className="pt-6 text-center">
              <Target className="w-8 h-8 text-green-300 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white drop-shadow-lg">
                {playersWithStats.reduce((sum, player) => sum + player.total_goals, 0)}
              </p>
              <p className="text-sm text-white/70 drop-shadow">Goles Totales</p>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white drop-shadow-lg">
                {playersWithStats.reduce((sum, player) => sum + player.total_yellow_cards, 0)}
              </p>
              <p className="text-sm text-white/70 drop-shadow">Tarjetas Amarillas</p>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-8 h-8 text-red-300 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white drop-shadow-lg">
                {playersWithStats.reduce((sum, player) => sum + player.total_red_cards, 0)}
              </p>
              <p className="text-sm text-white/70 drop-shadow">Tarjetas Rojas</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Statistics Section */}
        {playersWithStats.length > 0 && (
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center text-white drop-shadow-lg">
                <Trophy className="w-5 h-5 mr-2 text-yellow-300" />
                Estadísticas del Equipo
              </CardTitle>
              <CardDescription className="text-white/80 drop-shadow">
                Análisis detallado del rendimiento colectivo
              </CardDescription>
            </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Rendimiento Ofensivo */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                  <Target className="w-5 h-5 mr-2 text-green-300" />
                  Rendimiento Ofensivo
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 backdrop-blur-md bg-green-500/20 rounded-lg border border-green-400/30">
                    <p className="text-sm text-white/80 mb-1 drop-shadow">Goles Totales</p>
                    <p className="text-3xl font-bold text-green-300 drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_goals, 0)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-blue-500/20 rounded-lg border border-blue-400/30">
                    <p className="text-sm text-white/80 mb-1 drop-shadow">Asistencias Totales</p>
                    <p className="text-3xl font-bold text-blue-300 drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_assists, 0)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-purple-500/20 rounded-lg border border-purple-400/30">
                    <p className="text-sm text-white/80 mb-1 drop-shadow">Goles por Jugador</p>
                    <p className="text-3xl font-bold text-purple-300 drop-shadow-lg">
                      {(playersWithStats.reduce((sum, p) => sum + p.total_goals, 0) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-indigo-500/20 rounded-lg border border-indigo-400/30">
                    <p className="text-sm text-white/80 mb-1 drop-shadow">Asistencias por Jugador</p>
                    <p className="text-3xl font-bold text-indigo-300 drop-shadow-lg">
                      {(playersWithStats.reduce((sum, p) => sum + p.total_assists, 0) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Máximos Goleadores */}
              {(() => {
                const topScorers = [...playersWithStats]
                  .filter(p => p.total_goals > 0)
                  .sort((a, b) => b.total_goals - a.total_goals)
                  .slice(0, 3)

                return topScorers.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                      <Trophy className="w-5 h-5 mr-2 text-yellow-300" />
                      Máximos Goleadores
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      {topScorers.map((player, index) => (
                        <div key={player.id} className="p-4 backdrop-blur-md bg-white/10 rounded-lg border border-white/20 hover:bg-white/15 transition-all">
                          <div className="flex items-center space-x-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg backdrop-blur-md ${
                              index === 0 ? 'bg-yellow-500/80 text-white' :
                              index === 1 ? 'bg-gray-400/80 text-white' :
                              'bg-orange-500/80 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <Avatar className="w-10 h-10 border border-white/30">
                              {player.photo ? (
                                <AvatarImage src={player.photo} alt={player.name} />
                              ) : (
                                <AvatarFallback className="backdrop-blur-md bg-green-500/80 text-white">
                                  {getPlayerInitials(player.name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate text-white drop-shadow">{player.name}</p>
                              <p className="text-xs text-white/70">#{player.jersey_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-300 drop-shadow-lg">{player.total_goals}</p>
                              <p className="text-xs text-white/70">goles</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Máximos Asistidores */}
              {(() => {
                const topAssisters = [...playersWithStats]
                  .filter(p => p.total_assists > 0)
                  .sort((a, b) => b.total_assists - a.total_assists)
                  .slice(0, 3)

                return topAssisters.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                      <Target className="w-5 h-5 mr-2 text-blue-300" />
                      Máximos Asistidores
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      {topAssisters.map((player, index) => (
                        <div key={player.id} className="p-4 backdrop-blur-md bg-white/10 rounded-lg border border-white/20 hover:bg-white/15 transition-all">
                          <div className="flex items-center space-x-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg backdrop-blur-md ${
                              index === 0 ? 'bg-yellow-500/80 text-white' :
                              index === 1 ? 'bg-gray-400/80 text-white' :
                              'bg-orange-500/80 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <Avatar className="w-10 h-10 border border-white/30">
                              {player.photo ? (
                                <AvatarImage src={player.photo} alt={player.name} />
                              ) : (
                                <AvatarFallback className="backdrop-blur-md bg-blue-500/80 text-white">
                                  {getPlayerInitials(player.name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate text-white drop-shadow">{player.name}</p>
                              <p className="text-xs text-white/70">#{player.jersey_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-300 drop-shadow-lg">{player.total_assists}</p>
                              <p className="text-xs text-white/70">asist.</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Disciplina del Equipo */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                  <AlertTriangle className="w-5 h-5 mr-2 text-yellow-300" />
                  Disciplina
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 backdrop-blur-md bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-6 bg-yellow-400 rounded"></div>
                      <p className="text-sm text-white/80 drop-shadow">Tarjetas Amarillas</p>
                    </div>
                    <p className="text-3xl font-bold text-yellow-300 drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_yellow_cards, 0)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-red-500/20 rounded-lg border border-red-400/30">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-6 bg-red-500 rounded"></div>
                      <p className="text-sm text-white/80 drop-shadow">Tarjetas Rojas</p>
                    </div>
                    <p className="text-3xl font-bold text-red-300 drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_red_cards, 0)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-lg border border-white/20">
                    <p className="text-sm text-white/80 mb-2 drop-shadow">Tarjetas por Jugador</p>
                    <p className="text-3xl font-bold text-white drop-shadow-lg">
                      {((playersWithStats.reduce((sum, p) => sum + p.total_yellow_cards + p.total_red_cards, 0)) / playersWithStats.length).toFixed(1)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-lg border border-white/20">
                    <p className="text-sm text-white/80 mb-2 drop-shadow">Jugadores sin Tarjetas</p>
                    <p className="text-3xl font-bold text-green-300 drop-shadow-lg">
                      {playersWithStats.filter(p => p.total_yellow_cards === 0 && p.total_red_cards === 0).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Participación */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center text-white drop-shadow-lg">
                  <Clock className="w-5 h-5 mr-2 text-gray-300" />
                  Participación
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-lg border border-white/20">
                    <p className="text-sm text-white/80 mb-2 drop-shadow">Partidos Jugados (Total)</p>
                    <p className="text-3xl font-bold text-white drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_games, 0)}
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-lg border border-white/20">
                    <p className="text-sm text-white/80 mb-2 drop-shadow">Minutos Jugados (Total)</p>
                    <p className="text-3xl font-bold text-white drop-shadow-lg">
                      {playersWithStats.reduce((sum, p) => sum + p.total_minutes_played, 0).toLocaleString()}'
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-lg border border-white/20">
                    <p className="text-sm text-white/80 mb-2 drop-shadow">Promedio Minutos por Jugador</p>
                    <p className="text-3xl font-bold text-white drop-shadow-lg">
                      {Math.round(playersWithStats.reduce((sum, p) => sum + p.total_minutes_played, 0) / playersWithStats.length)}'
                    </p>
                  </div>
                  <div className="p-4 backdrop-blur-md bg-white/10 rounded-lg border border-white/20">
                    <p className="text-sm text-white/80 mb-2 drop-shadow">Jugadores Activos</p>
                    <p className="text-3xl font-bold text-green-300 drop-shadow-lg">
                      {playersWithStats.filter(p => p.total_games > 0).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Players Statistics Table */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-white drop-shadow-lg">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-300" />
                  Estadísticas de Jugadores
                </CardTitle>
                <CardDescription className="text-white/80 drop-shadow">
                  Rendimiento individual de cada jugador del equipo
                </CardDescription>
              </div>
              {isLeagueAdmin && playersWithStats.length > 0 && (
                <Button
                  onClick={handlePrintAllCredentials}
                  disabled={printingAll}
                  className="backdrop-blur-md bg-blue-500/80 hover:bg-blue-500/90 text-white border-0"
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
              <Users className="w-12 h-12 text-white/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2 drop-shadow-lg">
                No hay jugadores registrados
              </h3>
              <p className="text-white/80 drop-shadow">
                Los jugadores y sus estadísticas aparecerán aquí cuando se registren en el equipo
              </p>
              {team && (
                <p className="text-sm text-white/70 mt-2 drop-shadow">
                  Equipo: {team.name}
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/20">
                    <TableHead className="text-white/90 drop-shadow">Jugador</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">PJ</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Goles</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Asistencias</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">TA</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">TR</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Min</TableHead>
                    {isLeagueAdmin && <TableHead className="text-center text-white/90 drop-shadow">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playersWithStats.map((player) => (
                    <TableRow
                      key={player.id}
                      onClick={() => handlePlayerClick(player)}
                      className="cursor-pointer hover:bg-white/5 transition-colors border-b border-white/20"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8 border border-white/30">
                            {player.photo ? (
                              <AvatarImage src={player.photo} alt={player.name} />
                            ) : (
                              <AvatarFallback className="backdrop-blur-md bg-blue-500/80 text-white text-xs">
                                {getPlayerInitials(player.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium text-white drop-shadow flex items-center">
                              {player.name}
                              <span className="ml-2 text-sm font-bold text-green-600">
                                #{player.jersey_number}
                              </span>
                            </p>
                            <p className="text-sm text-white/70">{player.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-white/90">
                        {player.total_games}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="backdrop-blur-md bg-green-500/80 text-white border-0">
                          {player.total_goals}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="backdrop-blur-md bg-blue-500/80 text-white border-0">
                          {player.total_assists}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {player.total_yellow_cards > 0 && (
                          <Badge className="backdrop-blur-md bg-yellow-500/80 text-white border-0">
                            {player.total_yellow_cards}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {player.total_red_cards > 0 && (
                          <Badge className="backdrop-blur-md bg-red-500/80 text-white border-0">
                            {player.total_red_cards}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-white/80">
                        <div className="flex items-center justify-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {player.total_minutes_played}'
                        </div>
                      </TableCell>
                      {isLeagueAdmin && (
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateCredential(player)}
                            disabled={generatingQR}
                            className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0"
                          >
                            <IdCard className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Coaching Staff Table */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center text-white drop-shadow-lg">
              <Users className="w-5 h-5 mr-2 text-purple-300" />
              Cuerpo Técnico
            </CardTitle>
            <CardDescription className="text-white/80 drop-shadow">
              Miembros del cuerpo técnico del equipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-white/50 mx-auto mb-2 animate-spin" />
                <p className="text-white/80 drop-shadow">Cargando cuerpo técnico...</p>
              </div>
            ) : coachingStaff.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2 drop-shadow-lg">
                  No hay miembros del cuerpo técnico registrados
                </h3>
                <p className="text-white/80 drop-shadow">
                  Los miembros del cuerpo técnico aparecerán aquí cuando se registren
                </p>
              </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/20">
                    <TableHead className="text-white/90 drop-shadow">Miembro</TableHead>
                    <TableHead className="text-white/90 drop-shadow">Rol</TableHead>
                    <TableHead className="text-center text-white/90 drop-shadow">Cédula</TableHead>
                    {isLeagueAdmin && <TableHead className="text-center text-white/90 drop-shadow">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coachingStaff.map((staff) => (
                    <TableRow key={staff.id} className="border-b border-white/20 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8 border border-white/30">
                            {staff.photo ? (
                              <AvatarImage src={staff.photo} alt={staff.name} />
                            ) : (
                              <AvatarFallback className="backdrop-blur-md bg-purple-500/80 text-white text-xs">
                                {getPlayerInitials(staff.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium text-white drop-shadow">{staff.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="backdrop-blur-md bg-purple-500/80 text-white border-0">
                          {staff.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-white/80">
                        {staff.cedula || '-'}
                      </TableCell>
                      {isLeagueAdmin && (
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => handleGenerateStaffCredential(staff)}
                            disabled={generatingQR}
                            className="backdrop-blur-md bg-purple-500/80 hover:bg-purple-500/90 text-white border-0"
                          >
                            <IdCard className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
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
          player={(currentCredentialData.player || currentCredentialData.staff) as any}
          team={{ name: team.name, logo: team.logo, leagueLogo: leagueLogo }}
          qrData={currentCredentialData.qrData}
        />
      )}

      {/* Modal de Información del Jugador */}
      <Dialog open={playerModalOpen} onOpenChange={setPlayerModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 border-white/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3 text-white drop-shadow-lg">
              {selectedPlayer && (
                <>
                  <Avatar className="w-12 h-12 border-2 border-white/30">
                    {selectedPlayer.photo ? (
                      <AvatarImage src={selectedPlayer.photo} alt={selectedPlayer.name} />
                    ) : (
                      <AvatarFallback className="backdrop-blur-md bg-blue-500/80 text-white">
                        {getPlayerInitials(selectedPlayer.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span>{selectedPlayer.name}</span>
                      <Badge className="backdrop-blur-md bg-green-500/80 text-white border-0 shadow-lg">
                        #{selectedPlayer.jersey_number}
                      </Badge>
                    </div>
                    <p className="text-sm font-normal text-white/70 drop-shadow">{selectedPlayer.position}</p>
                  </div>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-white/80 drop-shadow">
              Información detallada y estadísticas del jugador
            </DialogDescription>
          </DialogHeader>

          {selectedPlayer && (
            <div className="space-y-6 mt-4">
              {/* Información Personal */}
              <div className="backdrop-blur-md bg-blue-500/20 p-4 rounded-xl border border-blue-300/30 shadow-lg">
                <h3 className="text-lg font-semibold mb-3 flex items-center text-white drop-shadow-lg">
                  <Users className="w-5 h-5 mr-2 text-blue-300" />
                  Información Personal
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-white/70 drop-shadow">Nombre Completo</p>
                    <p className="font-medium text-white drop-shadow">{selectedPlayer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70 drop-shadow">Posición</p>
                    <p className="font-medium text-white drop-shadow">{selectedPlayer.position}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70 drop-shadow">Número de Camiseta</p>
                    <p className="font-medium text-green-300 text-lg drop-shadow-lg">#{selectedPlayer.jersey_number}</p>
                  </div>
                  {(selectedPlayer as any).cedula && (
                    <div>
                      <p className="text-sm text-white/70 drop-shadow">Cédula</p>
                      <p className="font-medium text-white drop-shadow">{(selectedPlayer as any).cedula}</p>
                    </div>
                  )}
                  {selectedPlayer.birth_date && (
                    <div>
                      <p className="text-sm text-white/70 drop-shadow">Fecha de Nacimiento</p>
                      <p className="font-medium text-white drop-shadow">
                        {new Date(selectedPlayer.birth_date).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Estadísticas */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center text-white drop-shadow-lg">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-300" />
                  Estadísticas del Torneo
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-white drop-shadow-lg">{selectedPlayer.total_games}</p>
                      <p className="text-sm text-white/70 mt-1 drop-shadow">Partidos Jugados</p>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-green-300 drop-shadow-lg">{selectedPlayer.total_goals}</p>
                      <p className="text-sm text-white/70 mt-1 drop-shadow">Goles</p>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-blue-300 drop-shadow-lg">{selectedPlayer.total_assists}</p>
                      <p className="text-sm text-white/70 mt-1 drop-shadow">Asistencias</p>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-yellow-300 drop-shadow-lg">{selectedPlayer.total_yellow_cards}</p>
                      <p className="text-sm text-white/70 mt-1 drop-shadow">Tarjetas Amarillas</p>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-red-300 drop-shadow-lg">{selectedPlayer.total_red_cards}</p>
                      <p className="text-sm text-white/70 mt-1 drop-shadow">Tarjetas Rojas</p>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                    <CardContent className="pt-6 text-center">
                      <div className="flex items-center justify-center">
                        <Clock className="w-5 h-5 mr-2 text-gray-300" />
                        <p className="text-3xl font-bold text-white drop-shadow-lg">{selectedPlayer.total_minutes_played}</p>
                      </div>
                      <p className="text-sm text-white/70 mt-1 drop-shadow">Minutos Jugados</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Promedios y Ratios */}
              {selectedPlayer.total_games > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center text-white drop-shadow-lg">
                    <Target className="w-5 h-5 mr-2 text-green-300" />
                    Promedios
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 backdrop-blur-xl bg-green-500/20 rounded-xl border border-green-300/30 shadow-lg">
                      <p className="text-sm text-white/70 drop-shadow">Goles por Partido</p>
                      <p className="text-2xl font-bold text-green-300 drop-shadow-lg">
                        {(selectedPlayer.total_goals / selectedPlayer.total_games).toFixed(2)}
                      </p>
                    </div>

                    <div className="p-4 backdrop-blur-xl bg-blue-500/20 rounded-xl border border-blue-300/30 shadow-lg">
                      <p className="text-sm text-white/70 drop-shadow">Asistencias por Partido</p>
                      <p className="text-2xl font-bold text-blue-300 drop-shadow-lg">
                        {(selectedPlayer.total_assists / selectedPlayer.total_games).toFixed(2)}
                      </p>
                    </div>

                    <div className="p-4 backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 shadow-lg">
                      <p className="text-sm text-white/70 drop-shadow">Minutos por Partido</p>
                      <p className="text-2xl font-bold text-white drop-shadow-lg">
                        {Math.round(selectedPlayer.total_minutes_played / selectedPlayer.total_games)}'
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Disciplina */}
              {(selectedPlayer.total_yellow_cards > 0 || selectedPlayer.total_red_cards > 0) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center text-white drop-shadow-lg">
                    <AlertTriangle className="w-5 h-5 mr-2 text-yellow-300" />
                    Disciplina
                  </h3>
                  <div className="p-4 backdrop-blur-xl bg-yellow-500/20 rounded-xl border border-yellow-300/30 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-12 bg-yellow-400 rounded shadow-lg"></div>
                          <span className="text-2xl font-bold text-white drop-shadow-lg">{selectedPlayer.total_yellow_cards}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-12 bg-red-500 rounded shadow-lg"></div>
                          <span className="text-2xl font-bold text-white drop-shadow-lg">{selectedPlayer.total_red_cards}</span>
                        </div>
                      </div>
                      <p className="text-sm text-white/70 drop-shadow">
                        Total de tarjetas recibidas en el torneo
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}