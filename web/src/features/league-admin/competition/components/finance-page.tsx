import { Plus, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTeamsByLeague } from '@/features/league-admin/teams/api'
import { ApiError } from '@/lib/api/client'

import { useFinanceConfig, useLeagueSummary, useTeamBalances, useTransactions } from '../api'
import { FinanceBalances } from './finance-balances'
import { FinanceConfigDialog } from './finance-config-dialog'
import { FinanceOverview } from './finance-overview'
import { FinanceStats } from './finance-stats'
import { FinanceTransactions } from './finance-transactions'
import { NewTransactionDialog } from './new-transaction-dialog'

const tabClass = 'data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white'

export function FinancePage({ leagueId }: { leagueId: string }) {
  const [tab, setTab] = useState('overview')
  const [creating, setCreating] = useState(false)
  const [configuring, setConfiguring] = useState(false)

  const summary = useLeagueSummary(leagueId)
  const balances = useTeamBalances(leagueId, { limit: 100, offset: 0 })
  const config = useFinanceConfig(leagueId)
  const recent = useTransactions(leagueId, { limit: 5, offset: 0 })
  const teams = useTeamsByLeague(leagueId)
  const teamNames = useMemo(() => new Map((teams.data?.data ?? []).map((t) => [t.id, t.name])), [teams.data])

  // A league without finance data yet answers 404 on summary/config: that is "not configured", not a failure.
  const notConfigured = summary.error instanceof ApiError && summary.error.status === 404
  const summaryFailed = summary.isError && !notConfigured

  return (
    <section aria-labelledby="finance-title" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 id="finance-title" className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
            Gestión Financiera
          </h2>
          <p className="text-white/80 drop-shadow">Control de cuotas, multas y pagos de la liga</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfiguring(true)} className="backdrop-blur-md bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
            Configurar
          </Button>
          <Button size="sm" onClick={() => setCreating(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Nuevo Cargo
          </Button>
        </div>
      </div>

      {notConfigured && (
        <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100/90">
          Esta liga aún no tiene movimientos ni configuración financiera. Usa <strong>Configurar</strong> para definir cuotas y multas, o crea el primer cargo.
        </p>
      )}
      {summaryFailed && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {summary.error instanceof ApiError ? summary.error.message : 'No se pudo cargar el resumen financiero'}
        </p>
      )}

      <FinanceStats summary={summary.data} balances={balances.data?.data ?? []} />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="backdrop-blur-md bg-white/10 border border-white/20">
          <TabsTrigger value="overview" className={tabClass}>Resumen</TabsTrigger>
          <TabsTrigger value="transactions" className={tabClass}>Transacciones</TabsTrigger>
          <TabsTrigger value="balances" className={tabClass}>Equipos</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <FinanceOverview
            recent={recent.data?.data ?? []}
            balances={balances.data?.data ?? []}
            teamNames={teamNames}
            overdueCount={summary.data?.overdue_transactions ?? 0}
            totalOverdue={summary.data?.total_overdue}
            onTab={setTab}
          />
        </TabsContent>
        <TabsContent value="transactions">
          <FinanceTransactions leagueId={leagueId} teamNames={teamNames} onAdd={() => setCreating(true)} />
        </TabsContent>
        <TabsContent value="balances">
          <FinanceBalances leagueId={leagueId} />
        </TabsContent>
      </Tabs>

      {creating && <NewTransactionDialog leagueId={leagueId} onClose={() => setCreating(false)} />}
      {configuring && <FinanceConfigDialog leagueId={leagueId} config={config.data} onClose={() => setConfiguring(false)} />}
    </section>
  )
}
