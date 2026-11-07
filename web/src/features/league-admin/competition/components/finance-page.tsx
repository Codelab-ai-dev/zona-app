import { useState } from 'react'

import { EmptyState, QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

import { useTransactions, useLeagueSummary } from '../api'

export function FinancePage({ leagueId }: { leagueId: string }) {
  const [page, setPage] = useState(0)
  const pageSize = 25
  const transactions = useTransactions(leagueId, { limit: pageSize, offset: page * pageSize })
  const summary = useLeagueSummary(leagueId)

  return (
    <section aria-labelledby="finance-title" className="space-y-6">
      <header>
        <h2 id="finance-title" className="text-2xl font-bold">
          Finanzas
        </h2>
        <p className="text-sm text-muted-foreground">Gestión de transacciones y pagos de la liga</p>
      </header>

      {/* Summary Cards */}
      <QueryState query={summary} loadingLabel="Cargando finanzas…">
        {(data) => (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(data.total_income)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(data.total_collected)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(data.total_pending)}</p>
                <p className="text-xs text-muted-foreground">{data.overdue_transactions} vencidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Transacciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.total_transactions}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </QueryState>

      {/* Transactions Table */}
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {res.data.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(transaction.amount_paid)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="inline-flex items-center rounded-full px-2 py-1 bg-gray-100 text-gray-800">
                            {transaction.transaction_type.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {res.page && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Página {page + 1} de {Math.ceil((res.page.total ?? 0) / pageSize)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={(page + 1) * pageSize >= (res.page?.total ?? 0)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>
    </section>
  )
}

function formatCurrency(value: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(parseFloat(value) || 0)
}

function getStatusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
    case 'completed':
      return 'default'
    case 'pending':
    case 'partial':
      return 'secondary'
    case 'overdue':
      return 'destructive'
    default:
      return 'outline'
  }
}
