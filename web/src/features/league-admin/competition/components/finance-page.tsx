import { Plus } from 'lucide-react'
import { useState } from 'react'

import { EmptyState, QueryState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useTransactions } from '../api'
import { formatMoney } from '../money'
import { FinanceSummary } from './finance-summary'
import { NewTransactionDialog } from './new-transaction-dialog'
import { TransactionActions } from './transaction-actions'
import { statusLabels, transactionTypeLabel } from './transaction-types'

const PAGE_SIZE = 25

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'paid') return 'default'
  if (status === 'pending' || status === 'partial') return 'secondary'
  if (status === 'overdue') return 'destructive'
  return 'outline'
}

export function FinancePage({ leagueId }: { leagueId: string }) {
  const [page, setPage] = useState(0)
  const [creating, setCreating] = useState(false)
  const transactions = useTransactions(leagueId, { limit: PAGE_SIZE, offset: page * PAGE_SIZE })

  return (
    <section aria-labelledby="finance-title" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 id="finance-title" className="text-2xl font-bold">
            Finanzas
          </h2>
          <p className="text-sm text-muted-foreground">Gestión de transacciones y pagos de la liga</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo movimiento
        </Button>
      </header>

      {creating && <NewTransactionDialog leagueId={leagueId} onClose={() => setCreating(false)} />}

      <FinanceSummary leagueId={leagueId} />

      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            query={transactions}
            loadingLabel="Cargando transacciones…"
            isEmpty={(res) => res.data.length === 0}
            empty={<EmptyState title="Sin transacciones" description="No hay transacciones registradas" />}
          >
            {(res) => (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {res.data.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{tx.description}</TableCell>
                        <TableCell className="text-right">{formatMoney(tx.amount)}</TableCell>
                        <TableCell className="text-right">{formatMoney(tx.amount_paid)}</TableCell>
                        <TableCell className="text-xs">{transactionTypeLabel(tx.transaction_type)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(tx.status)}>{statusLabels[tx.status] ?? tx.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(tx.transaction_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <TransactionActions leagueId={leagueId} transaction={tx} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Página {page + 1} de {Math.max(1, Math.ceil((res.page.total ?? 0) / PAGE_SIZE))}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={(page + 1) * PAGE_SIZE >= (res.page.total ?? 0)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>
    </section>
  )
}
