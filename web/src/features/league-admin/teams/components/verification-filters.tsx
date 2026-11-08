import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { Team, VerificationStatus } from '../types'

const ALL = 'all'
const trigger = 'w-full border-white/10 bg-slate-800/50 text-white'

interface Props {
  status: VerificationStatus | ''
  teamId: string
  search: string
  teams: Team[]
  onStatus: (value: VerificationStatus | '') => void
  onTeam: (value: string) => void
  onSearch: (value: string) => void
}

export function VerificationFilters({ status, teamId, search, teams, onStatus, onTeam, onSearch }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor="verification-search" className="text-white/90">Buscar jugador</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-white/50" aria-hidden="true" />
          <Input id="verification-search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Nombre" className="border-white/10 bg-slate-800/50 pl-8 text-white" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="verification-status" className="text-white/90">Estado</Label>
        <Select value={status || ALL} onValueChange={(v) => onStatus(v === ALL ? '' : (v as VerificationStatus))}>
          <SelectTrigger id="verification-status" className={trigger}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="pending">Pendientes de verificar</SelectItem>
            <SelectItem value="verified">Verificados</SelectItem>
            <SelectItem value="no_document">Sin INE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="verification-team" className="text-white/90">Equipo</Label>
        <Select value={teamId || ALL} onValueChange={(v) => onTeam(v === ALL ? '' : v)}>
          <SelectTrigger id="verification-team" className={trigger}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los equipos</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
