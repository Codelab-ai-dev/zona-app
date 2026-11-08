import { CheckCircle, CreditCard, Users, XCircle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

import type { VerificationSummary as Summary } from '../types'

interface Props {
  summary: Summary | undefined
}

/** Counter cards (Total, Pendientes, Verificados, Sin INE) like the original. */
export function VerificationSummary({ summary }: Props) {
  const value = (n: number | undefined) => (n === undefined ? '–' : n)
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card className="border-white/20 bg-white/10 shadow-xl backdrop-blur-xl">
        <CardContent className="pt-4 text-center">
          <Users className="mx-auto mb-2 h-6 w-6 text-white/70" aria-hidden="true" />
          <p className="text-2xl font-bold text-white">{value(summary?.total)}</p>
          <p className="text-xs text-white/70">Total</p>
        </CardContent>
      </Card>
      <Card className="border-yellow-400/30 bg-yellow-500/20 shadow-xl backdrop-blur-xl">
        <CardContent className="pt-4 text-center">
          <CreditCard className="mx-auto mb-2 h-6 w-6 text-yellow-400" aria-hidden="true" />
          <p className="text-2xl font-bold text-yellow-400">{value(summary?.pending)}</p>
          <p className="text-xs text-yellow-300">Pendientes</p>
        </CardContent>
      </Card>
      <Card className="border-green-400/30 bg-green-500/20 shadow-xl backdrop-blur-xl">
        <CardContent className="pt-4 text-center">
          <CheckCircle className="mx-auto mb-2 h-6 w-6 text-green-400" aria-hidden="true" />
          <p className="text-2xl font-bold text-green-400">{value(summary?.verified)}</p>
          <p className="text-xs text-green-300">Verificados</p>
        </CardContent>
      </Card>
      <Card className="border-red-400/30 bg-red-500/20 shadow-xl backdrop-blur-xl">
        <CardContent className="pt-4 text-center">
          <XCircle className="mx-auto mb-2 h-6 w-6 text-red-400" aria-hidden="true" />
          <p className="text-2xl font-bold text-red-400">{value(summary?.no_document)}</p>
          <p className="text-xs text-red-300">Sin INE</p>
        </CardContent>
      </Card>
    </div>
  )
}
