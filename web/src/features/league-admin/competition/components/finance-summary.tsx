import { QueryState } from '@/components/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useLeagueSummary } from '../api'
import { formatMoney } from '../money'

export function FinanceSummary({ leagueId }: { leagueId: string }) {
  const summary = useLeagueSummary(leagueId)

  return (
    <QueryState query={summary} loadingLabel="Cargando finanzas…">
      {(data) => (
        <div className="grid gap-4 md:grid-cols-4">
          <Metric title="Total Ingresos" value={formatMoney(data.total_income)} />
          <Metric title="Total Cobrado" value={formatMoney(data.total_collected)} className="text-green-600" />
          <Metric
            title="Pendiente"
            value={formatMoney(data.total_pending)}
            className="text-orange-600"
            hint={`${data.overdue_transactions} vencidos`}
          />
          <Metric title="Total Transacciones" value={String(data.total_transactions)} />
        </div>
      )}
    </QueryState>
  )
}

function Metric({ title, value, hint, className }: { title: string; value: string; hint?: string; className?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${className ?? ''}`}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
