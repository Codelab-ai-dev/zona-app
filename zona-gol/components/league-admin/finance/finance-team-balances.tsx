"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Eye,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Receipt,
} from "lucide-react"
import type { FinanceTeamBalance, FinanceConfig } from "@/lib/types/finance"
import { formatCurrency } from "@/lib/types/finance"
import { useFinanceTransactionsByTeam } from "@/lib/queries/use-finance-query"

interface FinanceTeamBalancesProps {
  leagueId: string
  balances: FinanceTeamBalance[]
  config: FinanceConfig | null
}

export function FinanceTeamBalances({
  leagueId,
  balances,
  config,
}: FinanceTeamBalancesProps) {
  const [search, setSearch] = useState("")
  const [selectedTeam, setSelectedTeam] = useState<FinanceTeamBalance | null>(null)

  const currency = config?.currency || "MXN"

  // Filter balances
  const filteredBalances = useMemo(() => {
    if (!search) return balances

    const searchLower = search.toLowerCase()
    return balances.filter((b) =>
      b.team_name.toLowerCase().includes(searchLower)
    )
  }, [balances, search])

  // Summary
  const summary = useMemo(() => {
    return {
      total: balances.length,
      withDebt: balances.filter((b) => b.pending_balance > 0).length,
      upToDate: balances.filter((b) => b.pending_balance <= 0).length,
      totalDebt: balances.reduce((sum, b) => sum + b.pending_balance, 0),
      totalCollected: balances.reduce((sum, b) => sum + b.total_paid, 0),
    }
  }, [balances])

  return (
    <>
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-white drop-shadow-lg">
                Balance por Equipo
              </CardTitle>
              <CardDescription className="text-white/70">
                {summary.total} equipos -{" "}
                <span className="text-emerald-400">{summary.upToDate} al corriente</span>
                {summary.withDebt > 0 && (
                  <span className="text-red-400"> - {summary.withDebt} con deuda</span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-white/50">Total Pendiente</p>
                <p className="text-lg font-bold text-red-400">
                  {formatCurrency(summary.totalDebt, currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                placeholder="Buscar equipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 backdrop-blur-md bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70">Equipo</TableHead>
                  <TableHead className="text-white/70 text-right">Total Cargos</TableHead>
                  <TableHead className="text-white/70 text-right">Total Pagado</TableHead>
                  <TableHead className="text-white/70 text-right">Saldo Pendiente</TableHead>
                  <TableHead className="text-white/70">Estado</TableHead>
                  <TableHead className="text-white/70 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.length > 0 ? (
                  filteredBalances.map((team) => (
                    <TableRow
                      key={team.team_id}
                      className="border-white/10 hover:bg-white/5"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {team.team_logo ? (
                            <img
                              src={team.team_logo}
                              alt={team.team_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                              <span className="text-xs text-white font-semibold">
                                {team.team_name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">
                              {team.team_name}
                            </p>
                            {team.pending_fines_count > 0 && (
                              <p className="text-xs text-amber-400">
                                {team.pending_fines_count} multa(s) pendiente(s)
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-white/80">
                        {formatCurrency(team.total_charges, currency)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-400">
                        {formatCurrency(team.total_paid, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${
                            team.pending_balance > 0
                              ? "text-red-400"
                              : team.pending_balance < 0
                              ? "text-emerald-400"
                              : "text-white/60"
                          }`}
                        >
                          {team.pending_balance > 0 ? "-" : ""}
                          {formatCurrency(Math.abs(team.pending_balance), currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <TeamStatusBadge
                          pendingBalance={team.pending_balance}
                          overdueCount={team.overdue_count}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTeam(team)}
                          className="text-white/70 hover:text-white hover:bg-white/10"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-white/60 py-8"
                    >
                      No se encontraron equipos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Team Detail Modal */}
      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          config={config}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </>
  )
}

// Team Status Badge
function TeamStatusBadge({
  pendingBalance,
  overdueCount,
}: {
  pendingBalance: number
  overdueCount: number
}) {
  if (overdueCount > 0) {
    return (
      <Badge
        variant="outline"
        className="bg-red-500/20 text-red-300 border-red-500/30"
      >
        <AlertTriangle className="w-3 h-3 mr-1" />
        {overdueCount} vencido(s)
      </Badge>
    )
  }

  if (pendingBalance > 0) {
    return (
      <Badge
        variant="outline"
        className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        Con deuda
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    >
      <CheckCircle className="w-3 h-3 mr-1" />
      Al corriente
    </Badge>
  )
}

// Team Detail Modal
function TeamDetailModal({
  team,
  config,
  onClose,
}: {
  team: FinanceTeamBalance
  config: FinanceConfig | null
  onClose: () => void
}) {
  const { data: transactions = [], isLoading } = useFinanceTransactionsByTeam(
    team.team_id
  )
  const currency = config?.currency || "MXN"

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {team.team_logo ? (
              <img
                src={team.team_logo}
                alt={team.team_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg text-white font-semibold">
                  {team.team_name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <span>{team.team_name}</span>
              <p className="text-sm font-normal text-white/60">
                Estado de cuenta
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-white/50">Total Cargos</p>
            <p className="text-lg font-bold text-white">
              {formatCurrency(team.total_charges, currency)}
            </p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-white/50">Total Pagado</p>
            <p className="text-lg font-bold text-emerald-400">
              {formatCurrency(team.total_paid, currency)}
            </p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-white/50">Saldo Pendiente</p>
            <p
              className={`text-lg font-bold ${
                team.pending_balance > 0 ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {formatCurrency(team.pending_balance, currency)}
            </p>
          </div>
        </div>

        {/* Transactions List */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-white/70 mb-3">
            Historial de Transacciones
          </h4>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-white/50">Cargando...</div>
            ) : transactions.length > 0 ? (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-white/40" />
                      <p className="text-sm text-white">{tx.description}</p>
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      {new Date(tx.transaction_date).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        tx.is_income ? "text-emerald-400" : "text-white"
                      }`}
                    >
                      {tx.is_income ? "+" : "-"}
                      {formatCurrency(tx.amount, currency)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-xs mt-1 ${getStatusBadgeClass(tx.status)}`}
                    >
                      {getStatusLabel(tx.status)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-white/50">
                No hay transacciones registradas
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            Cerrar
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Receipt className="w-4 h-4 mr-2" />
            Generar Estado de Cuenta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    partial: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    overdue: "bg-red-500/20 text-red-300 border-red-500/30",
    cancelled: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    waived: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  }
  return classes[status] || classes.pending
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    paid: "Pagado",
    partial: "Parcial",
    overdue: "Vencido",
    cancelled: "Cancelado",
    waived: "Condonado",
  }
  return labels[status] || status
}

export default FinanceTeamBalances
