import { Badge } from '@/components/ui/badge'

import { statusLabels } from './transaction-types'

const statusClass: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  paid: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  partial: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  overdue: 'bg-red-500/20 text-red-300 border-red-500/30',
  cancelled: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  waived: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

export function TransactionStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`text-xs ${statusClass[status] ?? statusClass.pending}`}>
      {statusLabels[status] ?? status}
    </Badge>
  )
}
