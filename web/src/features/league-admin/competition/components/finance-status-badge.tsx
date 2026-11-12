import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react'

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

/** Account standing of a team: overdue charges, outstanding debt or up to date. */
export function TeamStatusBadge({ pendingBalance, overdueCount }: { pendingBalance: string; overdueCount: number }) {
  if (overdueCount > 0) {
    return (
      <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" />
        {overdueCount} vencido(s)
      </Badge>
    )
  }
  if (Number(pendingBalance) > 0) {
    return (
      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
        <AlertCircle className="w-3 h-3 mr-1" aria-hidden="true" />
        Con deuda
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
      <CheckCircle className="w-3 h-3 mr-1" aria-hidden="true" />
      Al corriente
    </Badge>
  )
}

/** Team logo, or its initial on a round chip. */
export function TeamAvatar({ name, logo, size = 'sm' }: { name: string; logo?: string; size?: 'sm' | 'lg' }) {
  const box = size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
  return logo ? (
    <img src={logo} alt="" className={`${box} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${box} rounded-full bg-white/20 flex items-center justify-center shrink-0`} aria-hidden="true">
      <span className={`${size === 'lg' ? 'text-lg' : 'text-xs'} text-white font-semibold`}>{name.charAt(0)}</span>
    </div>
  )
}
