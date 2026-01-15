"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Settings,
  Receipt,
  Users,
  RefreshCw,
} from "lucide-react"
import {
  useFinanceLeagueSummary,
  useFinanceTeamBalances,
  useFinanceTransactions,
  useFinanceConfig,
  usePendingFinanceTransactions,
} from "@/lib/queries/use-finance-query"
import { useLeagueFeatures } from "@/lib/hooks/use-league-features"
import { formatCurrency } from "@/lib/types/finance"
import { FinanceTransactionsTable } from "./finance-transactions-table"
import { FinanceTeamBalances } from "./finance-team-balances"
import { FinanceTransactionForm } from "./finance-transaction-form"
import { FinanceConfigForm } from "./finance-config-form"

interface FinanceDashboardProps {
  leagueId: string
}

export function FinanceDashboard({ leagueId }: FinanceDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  // Queries
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useFinanceLeagueSummary(leagueId)
  const { data: balances = [], isLoading: loadingBalances } = useFinanceTeamBalances(leagueId)
  const { data: transactions = [], isLoading: loadingTransactions } = useFinanceTransactions(leagueId)
  const { data: config, isLoading: loadingConfig } = useFinanceConfig(leagueId)
  const { data: pending } = usePendingFinanceTransactions(leagueId)
  const { hasFeature } = useLeagueFeatures(leagueId)

  const hasAutoFines = hasFeature("finance_auto_fines")
  const hasPayments = hasFeature("finance_payments")

  const isLoading = loadingSummary || loadingBalances || loadingTransactions || loadingConfig

  // Derived stats
  const stats = useMemo(() => {
    const teamsWithDebt = balances.filter((b) => b.pending_balance > 0).length
    const overdueCount = pending?.overdue?.length || 0
    const pendingCount = pending?.pending?.length || 0

    return {
      totalIncome: summary?.total_income || 0,
      totalPending: summary?.total_pending || 0,
      totalOverdue: summary?.total_overdue || 0,
      totalCollected: summary?.total_collected || 0,
      teamsWithDebt,
      overdueCount,
      pendingCount,
    }
  }, [summary, balances, pending])

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5)
  }, [transactions])

  // Teams with highest debt
  const teamsWithHighestDebt = useMemo(() => {
    return [...balances]
      .filter((b) => b.pending_balance > 0)
      .sort((a, b) => b.pending_balance - a.pending_balance)
      .slice(0, 5)
  }, [balances])

  if (isLoading) {
    return <FinanceDashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
            Gestión Financiera
          </h2>
          <p className="text-white/80 drop-shadow">
            Control de cuotas, multas y pagos de la liga
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfig(true)}
            className="backdrop-blur-md bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddTransaction(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cargo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Cobrado"
          value={formatCurrency(stats.totalCollected, config?.currency || "MXN")}
          description="Ingresos recibidos"
          icon={TrendingUp}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/20"
        />
        <StatsCard
          title="Pendiente de Cobro"
          value={formatCurrency(stats.totalPending, config?.currency || "MXN")}
          description={`${stats.pendingCount} transacciones`}
          icon={Wallet}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/20"
        />
        <StatsCard
          title="Vencido"
          value={formatCurrency(stats.totalOverdue, config?.currency || "MXN")}
          description={`${stats.overdueCount} transacciones`}
          icon={AlertTriangle}
          iconColor="text-red-400"
          iconBg="bg-red-500/20"
          alert={stats.overdueCount > 0}
        />
        <StatsCard
          title="Equipos con Deuda"
          value={stats.teamsWithDebt.toString()}
          description={`de ${balances.length} equipos`}
          icon={Users}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/20"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="backdrop-blur-md bg-white/10 border border-white/20">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white"
          >
            Resumen
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white"
          >
            Transacciones
          </TabsTrigger>
          <TabsTrigger
            value="balances"
            className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white"
          >
            Equipos
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Recent Transactions */}
            <Card className="backdrop-blur-xl bg-white/10 border-white/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white drop-shadow-lg">
                    Transacciones Recientes
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Últimos movimientos registrados
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("transactions")}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  Ver todas
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {tx.description}
                          </p>
                          <p className="text-sm text-white/60">
                            {tx.team?.name || "Sin equipo"} -{" "}
                            {new Date(tx.created_at).toLocaleDateString("es-ES")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span
                            className={`font-semibold ${
                              tx.is_income ? "text-emerald-400" : "text-white"
                            }`}
                          >
                            {tx.is_income ? "+" : "-"}
                            {formatCurrency(tx.amount, config?.currency || "MXN")}
                          </span>
                          <TransactionStatusBadge status={tx.status} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-4">
                      No hay transacciones registradas
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Teams with Debt */}
            <Card className="backdrop-blur-xl bg-white/10 border-white/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white drop-shadow-lg">
                    Equipos con Mayor Deuda
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Equipos con saldo pendiente
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("balances")}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  Ver todos
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamsWithHighestDebt.length > 0 ? (
                    teamsWithHighestDebt.map((team) => (
                      <div
                        key={team.team_id}
                        className="flex items-center justify-between p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {team.team_name}
                          </p>
                          <p className="text-sm text-white/60">
                            {team.overdue_count > 0 && (
                              <span className="text-red-400">
                                {team.overdue_count} vencido(s)
                              </span>
                            )}
                            {team.pending_fines_count > 0 && (
                              <span className="text-amber-400 ml-2">
                                {team.pending_fines_count} multa(s)
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="font-semibold text-red-400 ml-4">
                          {formatCurrency(team.pending_balance, config?.currency || "MXN")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-4">
                      Todos los equipos están al corriente
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {stats.overdueCount > 0 && (
            <Card className="backdrop-blur-xl bg-red-500/10 border-red-500/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-200">
                      Hay {stats.overdueCount} transacciones vencidas
                    </h3>
                    <p className="text-red-100/70 text-sm mt-1">
                      Total vencido: {formatCurrency(stats.totalOverdue, config?.currency || "MXN")}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-red-400/50 text-red-200 hover:bg-red-500/20"
                      onClick={() => setActiveTab("transactions")}
                    >
                      Ver transacciones vencidas
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <FinanceTransactionsTable
            leagueId={leagueId}
            transactions={transactions}
            config={config}
            onAddTransaction={() => setShowAddTransaction(true)}
          />
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances">
          <FinanceTeamBalances
            leagueId={leagueId}
            balances={balances}
            config={config}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showAddTransaction && (
        <FinanceTransactionForm
          leagueId={leagueId}
          config={config}
          onClose={() => setShowAddTransaction(false)}
        />
      )}

      {showConfig && (
        <FinanceConfigForm
          leagueId={leagueId}
          config={config}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  )
}

// Stats Card Component
interface StatsCardProps {
  title: string
  value: string
  description: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  alert?: boolean
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  alert,
}: StatsCardProps) {
  return (
    <Card
      className={`backdrop-blur-xl bg-white/10 border-white/20 hover:bg-white/15 transition-all ${
        alert ? "border-red-500/50" : ""
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/90 drop-shadow">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-full backdrop-blur-md ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
          {value}
        </div>
        <CardDescription className="text-xs text-white/70 drop-shadow">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

// Transaction Status Badge
function TransactionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Pendiente",
      className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    },
    paid: {
      label: "Pagado",
      className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    partial: {
      label: "Parcial",
      className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    overdue: {
      label: "Vencido",
      className: "bg-red-500/20 text-red-300 border-red-500/30",
    },
    cancelled: {
      label: "Cancelado",
      className: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    },
    waived: {
      label: "Condonado",
      className: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
  }

  const statusConfig = config[status] || config.pending

  return (
    <Badge variant="outline" className={`text-xs ${statusConfig.className}`}>
      {statusConfig.label}
    </Badge>
  )
}

// Loading Skeleton
function FinanceDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
          Gestión Financiera
        </h2>
        <p className="text-white/80 drop-shadow">Cargando datos...</p>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader>
              <div className="h-4 bg-white/20 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-white/20 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default FinanceDashboard
