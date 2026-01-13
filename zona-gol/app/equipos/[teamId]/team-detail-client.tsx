"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { ArrowLeft, Users, Trophy, AlertTriangle, Target, Clock, Loader2, IdCard, Printer, Home } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useQRGenerator } from "@/lib/hooks/use-qr-generator"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { PlayerCredential } from "@/components/team-owner/player-credential"
import { toast } from "sonner"

type Team = Database['public']['Tables']['teams']['Row']
type Player = Database['public']['Tables']['players']['Row']
type CoachingStaff = Database['public']['Tables']['coaching_staff']['Row']

interface PlayerWithStats extends Player {
  total_games: number
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_minutes_played: number
}

interface TeamRecord {
  matchesCount: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

interface InitialData {
  team: Team
  playersWithStats: PlayerWithStats[]
  coachingStaff: CoachingStaff[]
  leagueLogo: string
  leagueAdminId: string | null
  teamRecord: TeamRecord
}

interface TeamDetailClientProps {
  initialData: InitialData
}

export function TeamDetailClient({ initialData }: TeamDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile } = useAuth()
  const { generatePlayerQR } = useQRGenerator()
  const supabase = createClientSupabaseClient()

  // Get the return URL from query params
  const fromUrl = searchParams.get('from')

  // Usar datos pre-cargados del servidor
  const team = initialData.team
  const [playersWithStats] = useState<PlayerWithStats[]>(initialData.playersWithStats)
  const [coachingStaff] = useState<CoachingStaff[]>(initialData.coachingStaff)
  const [leagueLogo] = useState<string>(initialData.leagueLogo)
  const [teamRecord] = useState<TeamRecord>(initialData.teamRecord)

  const [generatingQR, setGeneratingQR] = useState(false)
  const [credentialModalOpen, setCredentialModalOpen] = useState(false)
  const [currentCredentialData, setCurrentCredentialData] = useState<{
    player?: PlayerWithStats,
    staff?: CoachingStaff,
    qrData: string
  } | null>(null)
  const [printingAll, setPrintingAll] = useState(false)
  const [isLeagueAdmin, setIsLeagueAdmin] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithStats | null>(null)
  const [playerModalOpen, setPlayerModalOpen] = useState(false)

  useEffect(() => {
    const checkLeagueAdmin = () => {
      if (!user) return

      const isSpecificLeagueAdmin = initialData.leagueAdminId === user.id

      const isSuperAdmin =
        user.email === 'zona.gol.gt@gmail.com' ||
        (user.app_metadata?.role === 'super_admin') ||
        (profile?.role === 'super_admin')

      const isGeneralLeagueAdmin = profile?.role === 'league_admin'

      const hasPermission = isSpecificLeagueAdmin || isSuperAdmin || isGeneralLeagueAdmin
      setIsLeagueAdmin(hasPermission)
    }

    checkLeagueAdmin()
  }, [user, profile, initialData.leagueAdminId])

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleBackClick = () => {
    if (fromUrl) {
      router.push(fromUrl)
    } else {
      router.back()
    }
  }

  const handlePlayerClick = (player: PlayerWithStats) => {
    setSelectedPlayer(player)
    setPlayerModalOpen(true)
  }

  const handleGenerateCredential = async (player: PlayerWithStats) => {
    setGeneratingQR(true)
    try {
      const qrResult = await generatePlayerQR(
        {
          id: player.id,
          name: player.name,
          team_id: player.team_id,
          jersey_number: player.jersey_number
        },
        {
          format: 'legacy',
          leagueId: team.league_id || undefined
        }
      )

      if (qrResult && qrResult.success) {
        setCurrentCredentialData({
          player,
          qrData: qrResult.qrData
        })
        setCredentialModalOpen(true)
      } else {
        toast.error('Error generando credencial')
      }
    } catch (error: any) {
      console.error('Error generando credencial:', error)
      toast.error(`Error generando credencial: ${error.message || 'Error desconocido'}`)
    } finally {
      setGeneratingQR(false)
    }
  }

  const handleGenerateStaffCredential = async (staff: CoachingStaff) => {
    setGeneratingQR(true)
    try {
      const qrData = JSON.stringify({
        t: 's',
        i: staff.id,
        n: staff.name,
        r: staff.role,
        tm: staff.team_id
      })

      setCurrentCredentialData({
        staff,
        qrData: qrData
      })
      setCredentialModalOpen(true)
    } catch (error: any) {
      console.error('Error generando credencial:', error)
      toast.error(`Error generando credencial: ${error.message || 'Error desconocido'}`)
    } finally {
      setGeneratingQR(false)
    }
  }

  const handlePrintAllCredentials = async () => {
    if (playersWithStats.length === 0 && coachingStaff.length === 0) {
      toast.error('No hay jugadores ni cuerpo técnico para imprimir')
      return
    }

    setPrintingAll(true)
    try {
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
            {
              format: 'legacy',
              leagueId: team.league_id || undefined
            }
          )

          let qrImageBase64 = ''
          if (qrResult?.success && qrResult.qrData) {
            try {
              qrImageBase64 = await QRCodeLib.toDataURL(qrResult.qrData, {
                width: 200,
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' }
              })
            } catch (error) {
              console.error('Error generando QR para', player.name, error)
            }
          }

          return { type: 'player' as const, player, qrImageBase64 }
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
              color: { dark: '#000000', light: '#ffffff' }
            })
          } catch (error) {
            console.error('Error generando QR para', staff.name, error)
          }

          return { type: 'staff' as const, staff, qrImageBase64 }
        })
      )

      const allCredentials = [...playersWithQR, ...staffWithQR]

      // Detectar si es móvil
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

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
                <div class="player-photo">${photoHTML}</div>
                <div class="player-info">
                  <h4 class="player-name">${player.name}</h4>
                  <p class="player-position">${player.position}</p>
                  <div class="jersey-number">${player.jersey_number}</div>
                </div>
                <div class="qr-container">${qrHTML}</div>
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
                <div class="player-photo">${photoHTML}</div>
                <div class="player-info">
                  <h4 class="player-name">${staff.name}</h4>
                  <p class="player-position">${staff.role}</p>
                  <div class="staff-badge">STAFF</div>
                </div>
                <div class="qr-container">${qrHTML}</div>
              </div>
              <div class="footer">
                <p class="credential-id">ID: ${staff.id.slice(-8).toUpperCase()}</p>
                <p class="valid-text">CUERPO TÉCNICO</p>
              </div>
            </div>
          `
        }
      }).join('')

      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Credenciales - ${team?.name}</title>
            <style>
              @page { size: A4; margin: 10mm; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; }
              .credentials-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10mm; padding: 10mm; }
              .credential { width: 85.6mm; height: 53.98mm; border: 2px solid #0066cc; border-radius: 8px; padding: 8px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; justify-content: space-between; break-inside: avoid; page-break-inside: avoid; position: relative; overflow: hidden; }
              .credential::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 120px; height: 120px; background-image: url('${leagueLogo}'); background-size: contain; background-position: center; background-repeat: no-repeat; opacity: 0.08; z-index: 0; pointer-events: none; }
              .credential > * { position: relative; z-index: 1; }
              .header { text-align: center; margin-bottom: 4px; }
              .team-header { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 2px; }
              .team-logo { width: 24px; height: 24px; object-fit: contain; }
              .team-name { font-size: 14px; font-weight: bold; color: #0066cc; margin: 0; line-height: 1; }
              .content { display: flex; align-items: center; gap: 6px; flex: 1; min-height: 90px; }
              .player-photo { flex-shrink: 0; width: 60px; height: 75px; background: white; border: 2px solid #cbd5e1; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
              .player-photo img { width: 100%; height: 100%; object-fit: cover; }
              .player-photo-placeholder { width: 100%; height: 100%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #64748b; }
              .player-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; height: 100%; }
              .player-name { font-size: 11px; font-weight: bold; color: #1e293b; margin: 0 0 2px 0; line-height: 1.1; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
              .player-position { font-size: 12px; color: #64748b; margin: 0 0 8px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
              .jersey-number { font-size: 20px; font-weight: bold; color: #0066cc; background: white; border: 3px solid #0066cc; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin: 0; align-self: flex-start; }
              .staff-badge { font-size: 11px; font-weight: bold; color: white; background: #9333ea; border-radius: 12px; padding: 4px 12px; margin: 0; align-self: flex-start; letter-spacing: 0.5px; }
              .staff-credential { border-color: #9333ea; }
              .staff-credential .team-name { color: #9333ea; }
              .qr-container { flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 4px; border: 2px solid #e2e8f0; width: 90px; height: 90px; }
              .footer { text-align: center; margin-top: 4px; }
              .credential-id { font-size: 8px; color: #64748b; margin: 0; font-weight: 500; }
              .valid-text { font-size: 9px; color: #0066cc; margin: 1px 0 0 0; font-weight: bold; letter-spacing: 0.5px; }
              @media print { body { margin: 0; padding: 0; } .credentials-container { padding: 10mm; } }
            </style>
          </head>
          <body>
            <div class="credentials-container">${credentialsHTML}</div>
          </body>
        </html>
      `

      if (isMobile) {
        // En móvil: usar iframe oculto para evitar bloqueos
        const iframe = document.createElement('iframe')
        iframe.style.position = 'fixed'
        iframe.style.right = '0'
        iframe.style.bottom = '0'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = 'none'

        document.body.appendChild(iframe)

        const iframeDoc = iframe.contentWindow?.document
        if (!iframeDoc) {
          document.body.removeChild(iframe)
          throw new Error('No se pudo crear contenido de impresión')
        }

        iframeDoc.open()
        iframeDoc.write(printHTML)
        iframeDoc.close()

        // Esperar a que las imágenes carguen
        await new Promise(resolve => setTimeout(resolve, 1000))

        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()

        // Limpiar después de imprimir
        setTimeout(() => {
          document.body.removeChild(iframe)
          setPrintingAll(false)
        }, 1500)
      } else {
        // En desktop: usar window.open
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
          throw new Error('No se pudo abrir ventana de impresión. Por favor permite ventanas emergentes.')
        }

        printWindow.document.write(printHTML)
        printWindow.document.close()
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
            setPrintingAll(false)
          }, 500)
        }
      }

    } catch (error: any) {
      console.error('Error imprimiendo credenciales:', error)
      toast.error(`Error imprimiendo credenciales: ${error.message || 'Error desconocido'}`)
      setPrintingAll(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex-1 container mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="rounded-xl md:rounded-2xl bg-slate-800/50 border border-white/10 p-3 md:p-5">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex gap-2">
              <Button
                onClick={() => window.location.href = '/'}
                size="sm"
                className="bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 h-8 w-8 md:h-9 md:w-9 p-0"
              >
                <Home className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleBackClick}
                size="sm"
                className="bg-slate-700/50 border border-white/10 text-white hover:bg-slate-700 h-8 w-8 md:h-9 md:w-9 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <Avatar className="w-12 h-12 md:w-16 md:h-16 border-2 border-green-500/30">
                {team.logo ? (
                  <AvatarImage src={team.logo} alt={`${team.name} logo`} />
                ) : (
                  <AvatarFallback className="bg-green-500/20 text-green-400 font-bold text-sm md:text-lg">
                    {team.name.split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">{team.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-[10px] md:text-xs border-0 ${team.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {team.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-5 gap-2 md:gap-4">
          <div className="rounded-lg md:rounded-xl bg-slate-800/50 border border-white/10 p-2 md:p-4 text-center">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-400 mx-auto mb-1 md:mb-2" />
            <p className="text-lg md:text-2xl font-bold text-white">{playersWithStats.length}</p>
            <span className="text-[10px] md:text-xs text-gray-500">Jugadores</span>
          </div>
          <div className="rounded-lg md:rounded-xl bg-slate-800/50 border border-white/10 p-2 md:p-4 text-center">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-400 mx-auto mb-1 md:mb-2" />
            <p className="text-lg md:text-2xl font-bold text-white">{coachingStaff.length}</p>
            <span className="text-[10px] md:text-xs text-gray-500">Staff</span>
          </div>
          <div className="rounded-lg md:rounded-xl bg-slate-800/50 border border-white/10 p-2 md:p-4 text-center">
            <Target className="w-4 h-4 md:w-5 md:h-5 text-green-400 mx-auto mb-1 md:mb-2" />
            <p className="text-lg md:text-2xl font-bold text-white">
              {playersWithStats.reduce((sum, player) => sum + player.total_goals, 0)}
            </p>
            <span className="text-[10px] md:text-xs text-gray-500">Goles</span>
          </div>
          <div className="rounded-lg md:rounded-xl bg-slate-800/50 border border-white/10 p-2 md:p-4 text-center">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 mx-auto mb-1 md:mb-2" />
            <p className="text-lg md:text-2xl font-bold text-white">
              {playersWithStats.reduce((sum, player) => sum + player.total_yellow_cards, 0)}
            </p>
            <span className="text-[10px] md:text-xs text-gray-500">TA</span>
          </div>
          <div className="rounded-lg md:rounded-xl bg-slate-800/50 border border-white/10 p-2 md:p-4 text-center">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-400 mx-auto mb-1 md:mb-2" />
            <p className="text-lg md:text-2xl font-bold text-white">
              {playersWithStats.reduce((sum, player) => sum + player.total_red_cards, 0)}
            </p>
            <span className="text-[10px] md:text-xs text-gray-500">TR</span>
          </div>
        </div>

        {/* Team Record */}
        {teamRecord && teamRecord.matchesCount > 0 && (
          <div className="rounded-xl md:rounded-2xl bg-slate-800/50 border border-white/10 p-3 md:p-5">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
              <h2 className="text-base md:text-lg font-bold text-white">Récord del Equipo</h2>
            </div>

            {/* Points highlight */}
            <div className="rounded-lg md:rounded-xl bg-gradient-to-r from-green-500/20 to-green-600/10 border border-green-500/20 p-3 md:p-4 mb-3 md:mb-4 text-center">
              <p className="text-xs md:text-sm text-gray-400">Puntos Totales</p>
              <p className="text-3xl md:text-4xl font-bold text-green-400 mt-1">{teamRecord.points}</p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                {teamRecord.wins}G × 3 + {teamRecord.draws}E × 1
              </p>
            </div>

            {/* Match stats grid */}
            <div className="grid grid-cols-4 gap-2 md:gap-3 mb-3 md:mb-4">
              <div className="rounded-lg bg-slate-700/50 border border-white/5 p-2 md:p-3 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 mb-1">PJ</p>
                <p className="text-lg md:text-xl font-bold text-white">{teamRecord.matchesCount}</p>
              </div>
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2 md:p-3 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 mb-1">G</p>
                <p className="text-lg md:text-xl font-bold text-green-400">{teamRecord.wins}</p>
              </div>
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2 md:p-3 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 mb-1">E</p>
                <p className="text-lg md:text-xl font-bold text-yellow-400">{teamRecord.draws}</p>
              </div>
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 md:p-3 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 mb-1">P</p>
                <p className="text-lg md:text-xl font-bold text-red-400">{teamRecord.losses}</p>
              </div>
            </div>

            {/* Goals stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
              <div className="rounded-lg bg-slate-700/50 border border-white/5 p-2 md:p-3 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 mb-1">GF</p>
                <p className="text-lg md:text-xl font-bold text-green-400">{teamRecord.goalsFor}</p>
              </div>
              <div className="rounded-lg bg-slate-700/50 border border-white/5 p-2 md:p-3 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 mb-1">GC</p>
                <p className="text-lg md:text-xl font-bold text-red-400">{teamRecord.goalsAgainst}</p>
              </div>
              <div className={`rounded-lg border p-2 md:p-3 text-center ${
                teamRecord.goalDifference >= 0
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <p className="text-[10px] md:text-xs text-gray-500 mb-1">DG</p>
                <p className={`text-lg md:text-xl font-bold ${
                  teamRecord.goalDifference >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {teamRecord.goalDifference >= 0 ? '+' : ''}{teamRecord.goalDifference}
                </p>
              </div>
            </div>

            {/* Win rate bar */}
            <div className="pt-2 md:pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                <span className="text-gray-400">% Victorias</span>
                <span className="font-bold text-green-400">
                  {((teamRecord.wins / teamRecord.matchesCount) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                  style={{ width: `${(teamRecord.wins / teamRecord.matchesCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Players Statistics Table */}
        <div className="rounded-xl md:rounded-2xl bg-slate-800/50 border border-white/10 p-3 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3 md:mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
              <h2 className="text-base md:text-lg font-bold text-white">Jugadores</h2>
              <span className="text-xs text-gray-500">({playersWithStats.length})</span>
            </div>
            {isLeagueAdmin && playersWithStats.length > 0 && (
              <Button
                onClick={handlePrintAllCredentials}
                disabled={printingAll}
                size="sm"
                className="bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 text-xs"
              >
                <Printer className="w-3 h-3 mr-1" />
                {printingAll ? 'Generando...' : 'Imprimir Credenciales'}
              </Button>
            )}
          </div>

          {playersWithStats.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-400 mb-1">No hay jugadores</h3>
              <p className="text-xs text-gray-500">Los jugadores aparecerán aquí cuando se registren</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 md:mx-0">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-2 md:pb-3 text-xs font-medium text-gray-500 text-left pl-3 md:pl-0">Jugador</th>
                    <th className="pb-2 md:pb-3 text-xs font-medium text-gray-500 text-center w-10">PJ</th>
                    <th className="pb-2 md:pb-3 text-xs font-medium text-gray-500 text-center w-10">G</th>
                    <th className="pb-2 md:pb-3 text-xs font-medium text-gray-500 text-center w-10">A</th>
                    <th className="pb-2 md:pb-3 text-xs font-medium text-gray-500 text-center w-10">TA</th>
                    <th className="pb-2 md:pb-3 text-xs font-medium text-gray-500 text-center w-10">TR</th>
                    <th className="hidden md:table-cell pb-2 md:pb-3 text-xs font-medium text-gray-500 text-center w-12">Min</th>
                    {isLeagueAdmin && <th className="pb-2 md:pb-3 text-xs font-medium text-gray-500 text-center w-12 pr-3 md:pr-0"></th>}
                  </tr>
                </thead>
                <tbody>
                  {playersWithStats.map((player, index) => (
                    <tr
                      key={player.id}
                      onClick={() => handlePlayerClick(player)}
                      className={`cursor-pointer hover:bg-white/5 transition-colors ${index !== playersWithStats.length - 1 ? 'border-b border-white/5' : ''}`}
                    >
                      <td className="py-2 md:py-3 pl-3 md:pl-0">
                        <div className="flex items-center gap-2 md:gap-3">
                          <Avatar className="w-7 h-7 md:w-8 md:h-8 border border-green-500/30">
                            {player.photo ? (
                              <AvatarImage src={player.photo} alt={player.name} />
                            ) : (
                              <AvatarFallback className="bg-green-500/20 text-green-400 text-[10px] md:text-xs">
                                {getPlayerInitials(player.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-white text-xs md:text-sm flex items-center gap-1 truncate">
                              <span className="truncate">{player.name}</span>
                              <span className="text-green-400 flex-shrink-0">#{player.jersey_number}</span>
                            </p>
                            <p className="text-[10px] md:text-xs text-gray-500 truncate">{player.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 md:py-3 text-center text-xs md:text-sm text-gray-400">{player.total_games}</td>
                      <td className="py-2 md:py-3 text-center">
                        <span className="text-xs md:text-sm font-medium text-green-400">{player.total_goals}</span>
                      </td>
                      <td className="py-2 md:py-3 text-center">
                        <span className="text-xs md:text-sm font-medium text-blue-400">{player.total_assists}</span>
                      </td>
                      <td className="py-2 md:py-3 text-center">
                        {player.total_yellow_cards > 0 && (
                          <span className="text-xs md:text-sm font-medium text-yellow-400">{player.total_yellow_cards}</span>
                        )}
                      </td>
                      <td className="py-2 md:py-3 text-center">
                        {player.total_red_cards > 0 && (
                          <span className="text-xs md:text-sm font-medium text-red-400">{player.total_red_cards}</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell py-2 md:py-3 text-center text-xs text-gray-500">
                        {player.total_minutes_played}'
                      </td>
                      {isLeagueAdmin && (
                        <td className="py-2 md:py-3 text-center pr-3 md:pr-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateCredential(player)}
                            disabled={generatingQR}
                            className="bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 h-7 w-7 p-0"
                          >
                            <IdCard className="w-3 h-3" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Coaching Staff Table */}
        <div className="rounded-xl md:rounded-2xl bg-slate-800/50 border border-white/10 p-3 md:p-5">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
            <h2 className="text-base md:text-lg font-bold text-white">Cuerpo Técnico</h2>
            <span className="text-xs text-gray-500">({coachingStaff.length})</span>
          </div>

          {coachingStaff.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-400 mb-1">No hay staff técnico</h3>
              <p className="text-xs text-gray-500">El cuerpo técnico aparecerá aquí cuando se registre</p>
            </div>
          ) : (
            <div className="space-y-2">
              {coachingStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-slate-700/30 border border-white/5 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <Avatar className="w-8 h-8 md:w-10 md:h-10 border border-purple-500/30">
                      {staff.photo ? (
                        <AvatarImage src={staff.photo} alt={staff.name} />
                      ) : (
                        <AvatarFallback className="bg-purple-500/20 text-purple-400 text-[10px] md:text-xs">
                          {getPlayerInitials(staff.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium text-white text-xs md:text-sm">{staff.name}</p>
                      <Badge className="bg-purple-500/20 text-purple-400 border-0 text-[10px] md:text-xs px-1.5 py-0">
                        {staff.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {staff.cedula && (
                      <span className="text-[10px] md:text-xs text-gray-500 hidden md:inline">{staff.cedula}</span>
                    )}
                    {isLeagueAdmin && (
                      <Button
                        size="sm"
                        onClick={() => handleGenerateStaffCredential(staff)}
                        disabled={generatingQR}
                        className="bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 h-7 w-7 p-0"
                      >
                        <IdCard className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white">
                {selectedPlayer && (
                  <>
                    <Avatar className="w-10 h-10 md:w-12 md:h-12 border-2 border-green-500/30">
                      {selectedPlayer.photo ? (
                        <AvatarImage src={selectedPlayer.photo} alt={selectedPlayer.name} />
                      ) : (
                        <AvatarFallback className="bg-green-500/20 text-green-400">
                          {getPlayerInitials(selectedPlayer.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base md:text-lg">{selectedPlayer.name}</span>
                        <Badge className="bg-green-500/20 text-green-400 border-0">
                          #{selectedPlayer.jersey_number}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm font-normal text-gray-400">{selectedPlayer.position}</p>
                    </div>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-gray-500 text-xs">
                Estadísticas del jugador
              </DialogDescription>
            </DialogHeader>

            {selectedPlayer && (
              <div className="space-y-4 mt-3">
                {/* Personal info */}
                <div className="rounded-lg bg-slate-800/50 border border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-green-400" />
                    <h3 className="text-sm font-medium text-white">Información</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-500">Posición</p>
                      <p className="text-xs text-white">{selectedPlayer.position}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Número</p>
                      <p className="text-xs text-green-400 font-bold">#{selectedPlayer.jersey_number}</p>
                    </div>
                    {selectedPlayer.birth_date && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-gray-500">Fecha de Nacimiento</p>
                        <p className="text-xs text-white">
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

                {/* Stats grid */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-sm font-medium text-white">Estadísticas</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-slate-800/50 border border-white/10 p-2 text-center">
                      <p className="text-lg md:text-xl font-bold text-white">{selectedPlayer.total_games}</p>
                      <p className="text-[10px] text-gray-500">PJ</p>
                    </div>
                    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2 text-center">
                      <p className="text-lg md:text-xl font-bold text-green-400">{selectedPlayer.total_goals}</p>
                      <p className="text-[10px] text-gray-500">Goles</p>
                    </div>
                    <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 text-center">
                      <p className="text-lg md:text-xl font-bold text-blue-400">{selectedPlayer.total_assists}</p>
                      <p className="text-[10px] text-gray-500">Asist.</p>
                    </div>
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2 text-center">
                      <p className="text-lg md:text-xl font-bold text-yellow-400">{selectedPlayer.total_yellow_cards}</p>
                      <p className="text-[10px] text-gray-500">TA</p>
                    </div>
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-center">
                      <p className="text-lg md:text-xl font-bold text-red-400">{selectedPlayer.total_red_cards}</p>
                      <p className="text-[10px] text-gray-500">TR</p>
                    </div>
                    <div className="rounded-lg bg-slate-800/50 border border-white/10 p-2 text-center">
                      <p className="text-lg md:text-xl font-bold text-white">{selectedPlayer.total_minutes_played}'</p>
                      <p className="text-[10px] text-gray-500">Min</p>
                    </div>
                  </div>
                </div>

                {/* Averages */}
                {selectedPlayer.total_games > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-green-400" />
                      <h3 className="text-sm font-medium text-white">Promedios</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2 text-center">
                        <p className="text-sm md:text-base font-bold text-green-400">
                          {(selectedPlayer.total_goals / selectedPlayer.total_games).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-500">G/Partido</p>
                      </div>
                      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 text-center">
                        <p className="text-sm md:text-base font-bold text-blue-400">
                          {(selectedPlayer.total_assists / selectedPlayer.total_games).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-500">A/Partido</p>
                      </div>
                      <div className="rounded-lg bg-slate-800/50 border border-white/10 p-2 text-center">
                        <p className="text-sm md:text-base font-bold text-white">
                          {Math.round(selectedPlayer.total_minutes_played / selectedPlayer.total_games)}'
                        </p>
                        <p className="text-[10px] text-gray-500">Min/Partido</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <footer className="mt-auto py-4 text-center">
          <p className="text-gray-600 text-xs">© 2025 Zona Gol</p>
        </footer>
      </div>
    </div>
  )
}
