import { Plus } from 'lucide-react'
import { useState } from 'react'

import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useTransactions } from '../api'
import { formatMoney } from '../money'
import { TransactionStatusBadge } from './finance-status-badge'
import { TransactionActions } from './transaction-actions'
import { transactionTypeLabel } from './transaction-types'

const PAGE_SIZE = 25
const outlineButton = 'backdrop-blur-md bg-white/10 border-white/20 text-white hover:bg-white/20'

export function FinanceTransactions({ leagueId, teamNames, onAdd }: { leagueId: string; teamNames: Map<string, string>; onAdd: () => void }) {
  const [page, setPage] = useState(0)
  const transactions = useTransactions(leagueId, { limit: PAGE_SIZE, offset: page * PAGE_SIZE })

  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white drop-shadow-lg">Transacciones</CardTitle>
          <CardDescription className="text-white/70">Cargos, multas y pagos de la liga</CardDescription>
        </div>
        <Button size="sm" onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
          Nuevo Cargo
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.isPending ? (
          <LoadingState label="Cargando transacciones…" />
        ) : transactions.isError ? (
          <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
        ) : transactions.data.data.length === 0 ? (
          <div className="text-center text-white/60 py-8">
            <p className="font-medium text-white/80">Sin transacciones</p>
            <p className="text-sm">No hay transacciones registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70">Fecha</TableHead>
                  <TableHead className="text-white/70">Descripción</TableHead>
                  <TableHead className="text-white/70">Equipo</TableHead>
                  <TableHead className="text-white/70">Tipo</TableHead>
                  <TableHead className="text-white/70 text-right">Monto</TableHead>
                  <TableHead className="text-white/70 text-right">Pagado</TableHead>
                  <TableHead className="text-white/70">Estado</TableHead>
                  <TableHead className="text-white/70 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.data.data.map((tx) => (
                  <TableRow key={tx.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/80">{new Date(tx.transaction_date).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell className="text-white font-medium max-w-[200px] truncate">{tx.description}</TableCell>
                    <TableCell className="text-white/80">{(tx.team_id && teamNames.get(tx.team_id)) || '-'}</TableCell>
                    <TableCell className="text-xs text-white/60">{transactionTypeLabel(tx.transaction_type)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${tx.is_income ? 'text-emerald-400' : 'text-white'}`}>{formatMoney(tx.amount)}</span>
                    </TableCell>
                    <TableCell className="text-right text-white/80">{formatMoney(tx.amount_paid)}</TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={tx.status} />
                    </TableCell>
                    <TableCell>
                      <TransactionActions leagueId={leagueId} transaction={tx} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <p className="text-sm text-white/60">
                Página {page + 1} de {Math.max(1, Math.ceil((transactions.data.page.total ?? 0) / PAGE_SIZE))}
              </p>
              <div className="flex gap-2">
                <Button size="sm" className={outlineButton} onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                  Anterior
                </Button>
                <Button size="sm" className={outlineButton} onClick={() => setPage(page + 1)} disabled={(page + 1) * PAGE_SIZE >= (transactions.data.page.total ?? 0)}>
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
