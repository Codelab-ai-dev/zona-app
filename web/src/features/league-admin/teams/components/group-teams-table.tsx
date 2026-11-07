import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { GROUP_LETTERS } from '../groups-logic'
import type { Team } from '../types'

interface GroupTeamsTableProps {
  teams: Team[]
  failed: Record<string, string>
  disabled: boolean
  onAssign: (teamId: string, group: string) => void
}

/** Teams with a per-row group selector; failed PATCHes are listed per team. */
export function GroupTeamsTable({ teams, failed, disabled, onAssign }: GroupTeamsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Equipo</TableHead>
            <TableHead>Grupo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => (
            <TableRow key={team.id} className={failed[team.id] ? 'bg-destructive/10' : ''}>
              <TableCell>
                <p className="font-medium">{team.name}</p>
                <p className="text-sm text-muted-foreground">{team.slug}</p>
              </TableCell>
              <TableCell>
                <Select value={team.group_name ?? ''} onValueChange={(value) => onAssign(team.id, value)} disabled={disabled}>
                  <SelectTrigger className="w-32" aria-label={`Grupo de ${team.name}`}>
                    <SelectValue placeholder="Grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_LETTERS.map((letter) => (
                      <SelectItem key={letter} value={letter}>
                        Grupo {letter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
