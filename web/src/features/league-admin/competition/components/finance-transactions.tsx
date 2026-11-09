import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useCurrency, useTransactions } from '../api'
import { formatMoney } from '../money'
import { FinanceFilters, noFilters, type TransactionFilterState } from './finance-filters'
import { TransactionStatusBadge } from './finance-status-badge'
import { TransactionActions } from './transaction-actions'
import { transactionTypeLabel } from './transaction-types'

const PAGE_SIZE = 25

function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}
const outlineButton = 'backdrop-blur-md bg-white/10 border-white/20 text-white hover:bg-white/20'

export function FinanceTransactions({ leagueId, teamNames, onAdd }: { leagueId: string; teamNames: Map<string, string>; onAdd: () => void }) {
  const [page, setPage] = useState(0)
  const currency = useCurrency(leagueId)
  const [filters, setFilters] = useState<TransactionFilterState>(noFilters)
  const q = useDebounced(filters.search.trim()).slice(0, 100)
  const transactions = useTransactions(leagueId, { limit: PAGE_SIZE, offset: page * PAGE_SIZE }, { status: filters.status, transaction_type: filters.type, q })
  const rows = transactions.data?.data ?? []
  const pendingRows = rows.filter((tx) => tx.status === 'pending').length
  const overdueRows = rows.filter((tx) => tx.status === 'overdue').length
  const filtered = filters.status !== 'all' || filters.type !== 'all' || q !== ''
  const changeFilters = (next: TransactionFilterState) => {
    // Status, type and search are server-side: they change the result set, so go back to the first page.
    if (next.status !== filters.status || next.type !== filters.type || next.search !== filters.search) setPage(0)
    setFilters(next)
  }

  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white drop-shadow-lg">Transacciones</CardTitle>
          <CardDescription className="text-white/70">
            {filtered ? rows.length : (transactions.data?.page.total ?? rows.length)} transacciones encontradas
            {pendingRows > 0 && <span className="text-yellow-400 ml-2">({pendingRows} pendientes)</span>}
            {overdueRows > 0 && <span className="text-red-400 ml-2">({overdueRows} vencidas)</span>}
          </CardDescription>
        </div>
        <Button size="sm" onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
          Nuevo Cargo
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <FinanceFilters value={filters} onChange={changeFilters} />
        {transactions.isPending ? (
          <LoadingState label="Cargando transacciones…" />
        ) : transactions.isError ? (
          <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
        ) : rows.length === 0 ? (
          <div className="text-center text-white/60 py-8">
            <p className="font-medium text-white/80">{filtered ? 'Sin resultados' : 'Sin transacciones'}</p>
            <p className="text-sm">{filtered ? 'Ninguna transacción coincide con los filtros' : 'No hay transacciones registradas'}</p>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={() => changeFilters(noFilters)} className="mt-2 text-white/80 hover:text-white hover:bg-white/10">
                Limpiar filtros
              </Button>
            )}
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
                {rows.map((tx) => (
                  <TableRow key={tx.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/80">{new Date(tx.transaction_date).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="text-white font-medium truncate">{tx.description}</p>
                        {tx.player_name && (
                          <p className="text-xs text-white/50">
                            {tx.player_name}
                            {tx.player_number !== undefined && ` #${tx.player_number}`}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-white/80">{(tx.team_id && teamNames.get(tx.team_id)) || '-'}</TableCell>
                    <TableCell className="text-xs text-white/60">{transactionTypeLabel(tx.transaction_type)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${tx.is_income ? 'text-emerald-400' : 'text-white'}`}>
                        {tx.is_income ? '+' : '-'}
                        {formatMoney(tx.amount, currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-white/80">{Number(tx.amount_paid) > 0 ? formatMoney(tx.amount_paid, currency) : '-'}</TableCell>
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
