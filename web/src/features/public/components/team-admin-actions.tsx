import { IdCard, Printer } from 'lucide-react'
import { useMemo } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import QRCode from 'react-qr-code'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useMyLeagues } from '@/features/leagues/api'
import { useAuth } from '@/lib/auth/auth-context'

import { useTeamCoachingStaff, useTeamPlayers, useTeamPlayerStats } from '../api'
import type { Team } from '../types'
import { buildCredentialsHtml, buildPlayerQrPayload, buildRosterHtml, printHtml } from './team-print'

/**
 * Print buttons for super admins and the admin of the team's league. Purely a
 * UX gate: the data printed is public anyway.
 */
export function TeamAdminActions({ team }: { team: Team }) {
  const { status, profile } = useAuth()
  if (status !== 'authenticated' || !profile) return null
  if (profile.role === 'super_admin') return <Buttons team={team} />
  if (profile.role === 'league_admin') return <LeagueAdminGate team={team} />
  return null
}

function LeagueAdminGate({ team }: { team: Team }) {
  const mine = useMyLeagues()
  if (!mine.data?.data.some((l) => l.id === team.league_id)) return null
  return <Buttons team={team} />
}

function Buttons({ team }: { team: Team }) {
  const stats = useTeamPlayerStats(team.id)
  const players = useTeamPlayers(team.id)
  const staff = useTeamCoachingStaff(team.id)
  const rosterStats = useMemo(() => stats.data?.data ?? [], [stats.data])

  const printRoster = () => {
    if (rosterStats.length === 0 && !staff.data?.data.length) {
      toast.error('No hay jugadores ni cuerpo técnico para imprimir')
      return
    }
    const ok = printHtml(buildRosterHtml({ team, players: rosterStats, staff: staff.data?.data ?? [] }))
    if (!ok) toast.error('No se pudo abrir la ventana de impresión')
  }

  const printCredentials = () => {
    const list = players.data?.data ?? []
    if (list.length === 0) {
      toast.error('No hay jugadores para imprimir')
      return
    }
    const qrSvgs = list.map((p) =>
      renderToStaticMarkup(
        <QRCode value={buildPlayerQrPayload(p, team.league_id)} size={86} level="M" fgColor="#000000" bgColor="#ffffff" />,
      ),
    )
    if (!printHtml(buildCredentialsHtml({ team, players: list, qrSvgs }))) toast.error('No se pudo abrir la ventana de impresión')
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={printRoster} disabled={stats.isPending} className="border-white/10 bg-slate-700/50 text-white hover:bg-slate-700">
        <Printer className="size-4" aria-hidden="true" />
        Imprimir Plantilla
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={printCredentials} disabled={players.isPending} className="border-white/10 bg-slate-700/50 text-white hover:bg-slate-700">
        <IdCard className="size-4" aria-hidden="true" />
        Imprimir Credenciales
      </Button>
    </div>
  )
}
