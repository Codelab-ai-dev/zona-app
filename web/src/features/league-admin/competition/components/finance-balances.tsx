import { Eye, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useCurrency, useTeamBalances } from '../api'
import { absAmount, formatMoney, sumAmounts } from '../money'
import type { TeamBalance } from '../types'
import { TeamAvatar, TeamStatusBadge } from './finance-status-badge'
import { TeamBalanceDialog } from './team-balance-dialog'

const head = 'text-white/70'

/** "Balance por Equipo": charges, payments and pending balance of every team, highest debt first. */
export function FinanceBalances({ leagueId }: { leagueId: string }) {
  const balances = useTeamBalances(leagueId, { limit: 100, offset: 0 })
  const currency = useCurrency(leagueId)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<TeamBalance | null>(null)

  const all = useMemo(() => [...(balances.data?.data ?? [])].sort((a, b) => Number(b.pending_balance) - Number(a.pending_balance)), [balances.data])
  const rows = all.filter((b) => b.team_name.toLowerCase().includes(search.trim().toLowerCase()))
  const withDebt = all.filter((b) => Number(b.pending_balance) > 0).length

  return (
    <>
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-white drop-shadow-lg">Balance por Equipo</CardTitle>
              <CardDescription className="text-white/70">
                {all.length} equipos - <span className="text-emerald-400">{all.length - withDebt} al corriente</span>
                {withDebt > 0 && <span className="text-red-400"> - {withDebt} con deuda</span>}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50">Total Pendiente</p>
              <p className="text-lg font-bold text-red-400">{formatMoney(sumAmounts(all.map((b) => b.pending_balance)), currency)}</p>
            </div>
          </div>
          <div className="relative max-w-sm mt-4">
            <Label htmlFor="balance-search" className="sr-only">
              Buscar equipo
            </Label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" aria-hidden="true" />
            <Input
              id="balance-search"
              placeholder="Buscar equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 backdrop-blur-md bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
        </CardHeader>
        <CardContent>
          {balances.isPending ? (
            <LoadingState label="Cargando equipos…" />
          ) : balances.isError ? (
            <ErrorState error={balances.error} onRetry={() => void balances.refetch()} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className={head}>Equipo</TableHead>
                    <TableHead className={`${head} text-right`}>Total Cargos</TableHead>
                    <TableHead className={`${head} text-right`}>Total Pagado</TableHead>
                    <TableHead className={`${head} text-right`}>Saldo Pendiente</TableHead>
                    <TableHead className={head}>Estado</TableHead>
                    <TableHead className={`${head} text-right`}>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length > 0 ? (
                    rows.map((team) => {
                      const pending = Number(team.pending_balance)
                      return (
                        <TableRow key={team.team_id} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <TeamAvatar name={team.team_name} logo={team.team_logo} />
                              <div>
                                <p className="text-white font-medium">{team.team_name}</p>
                                {team.pending_fines_count > 0 && <p className="text-xs text-amber-400">{team.pending_fines_count} multa(s) pendiente(s)</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-white/80">{formatMoney(team.total_charges, currency)}</TableCell>
                          <TableCell className="text-right text-emerald-400">{formatMoney(team.total_paid, currency)}</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold ${pending > 0 ? 'text-red-400' : pending < 0 ? 'text-emerald-400' : 'text-white/60'}`}>
                              {pending > 0 ? '-' : ''}
                              {formatMoney(absAmount(team.pending_balance), currency)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <TeamStatusBadge pendingBalance={team.pending_balance} overdueCount={team.overdue_count} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelected(team)}
                              aria-label={`Ver estado de cuenta de ${team.team_name}`}
                              className="text-white/70 hover:text-white hover:bg-white/10"
                            >
                              <Eye className="w-4 h-4 mr-2" aria-hidden="true" />
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-white/60 py-8">
                        No se encontraron equipos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {selected && <TeamBalanceDialog leagueId={leagueId} team={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
