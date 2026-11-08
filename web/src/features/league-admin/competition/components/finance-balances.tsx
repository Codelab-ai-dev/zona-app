import { ErrorState, LoadingState } from '@/components/states'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useTeamBalances } from '../api'
import { formatMoney } from '../money'

/** Per-team account statement (charges, paid and pending balance). */
export function FinanceBalances({ leagueId }: { leagueId: string }) {
  const balances = useTeamBalances(leagueId, { limit: 100, offset: 0 })

  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white drop-shadow-lg">Estado de Cuenta por Equipo</CardTitle>
        <CardDescription className="text-white/70">Cargos, pagos y saldo pendiente de cada equipo</CardDescription>
      </CardHeader>
      <CardContent>
        {balances.isPending ? (
          <LoadingState label="Cargando equipos…" />
        ) : balances.isError ? (
          <ErrorState error={balances.error} onRetry={() => void balances.refetch()} />
        ) : balances.data.data.length === 0 ? (
          <p className="text-white/60 text-center py-8">Aún no hay movimientos por equipo</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70">Equipo</TableHead>
                  <TableHead className="text-white/70 text-right">Cargos</TableHead>
                  <TableHead className="text-white/70 text-right">Pagado</TableHead>
                  <TableHead className="text-white/70 text-right">Pendiente</TableHead>
                  <TableHead className="text-white/70 text-right">Vencidos</TableHead>
                  <TableHead className="text-white/70 text-right">Multas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.data.data.map((b) => (
                  <TableRow key={b.team_id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white font-medium">{b.team_name}</TableCell>
                    <TableCell className="text-right text-white/80">{formatMoney(b.total_charges)}</TableCell>
                    <TableCell className="text-right text-emerald-400">{formatMoney(b.total_paid)}</TableCell>
                    <TableCell className={`text-right font-semibold ${Number(b.pending_balance) > 0 ? 'text-red-400' : 'text-white/80'}`}>{formatMoney(b.pending_balance)}</TableCell>
                    <TableCell className="text-right text-red-300">{b.overdue_count || '-'}</TableCell>
                    <TableCell className="text-right text-amber-300">{b.pending_fines_count || '-'}</TableCell>
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
