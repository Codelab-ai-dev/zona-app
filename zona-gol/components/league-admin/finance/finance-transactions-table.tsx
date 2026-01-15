"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  CreditCard,
  X,
  FileText,
  Download,
} from "lucide-react"
import type {
  FinanceTransactionWithRelations,
  FinanceConfig,
  FinanceTransactionStatus,
  FinanceTransactionType,
} from "@/lib/types/finance"
import {
  formatCurrency,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
  getStatusColor,
} from "@/lib/types/finance"
import { FinancePaymentForm } from "./finance-payment-form"

interface FinanceTransactionsTableProps {
  leagueId: string
  transactions: FinanceTransactionWithRelations[]
  config: FinanceConfig | null
  onAddTransaction: () => void
}

export function FinanceTransactionsTable({
  leagueId,
  transactions,
  config,
  onAddTransaction,
}: FinanceTransactionsTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedTransaction, setSelectedTransaction] =
    useState<FinanceTransactionWithRelations | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const currency = config?.currency || "MXN"

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesSearch =
          tx.description.toLowerCase().includes(searchLower) ||
          tx.team?.name?.toLowerCase().includes(searchLower) ||
          tx.player?.name?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== "all" && tx.status !== statusFilter) {
        return false
      }

      // Type filter
      if (typeFilter !== "all" && tx.transaction_type !== typeFilter) {
        return false
      }

      return true
    })
  }, [transactions, search, statusFilter, typeFilter])

  // Summary stats
  const summary = useMemo(() => {
    const filtered = filteredTransactions
    return {
      total: filtered.length,
      totalAmount: filtered.reduce(
        (sum, tx) => sum + (tx.is_income ? tx.amount : -tx.amount),
        0
      ),
      pending: filtered.filter((tx) => tx.status === "pending").length,
      overdue: filtered.filter((tx) => tx.status === "overdue").length,
    }
  }, [filteredTransactions])

  const handleRegisterPayment = (tx: FinanceTransactionWithRelations) => {
    setSelectedTransaction(tx)
    setShowPaymentForm(true)
  }

  const handleClosePaymentForm = () => {
    setSelectedTransaction(null)
    setShowPaymentForm(false)
  }

  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-white drop-shadow-lg">
              Transacciones
            </CardTitle>
            <CardDescription className="text-white/70">
              {summary.total} transacciones encontradas
              {summary.pending > 0 && (
                <span className="text-yellow-400 ml-2">
                  ({summary.pending} pendientes)
                </span>
              )}
              {summary.overdue > 0 && (
                <span className="text-red-400 ml-2">
                  ({summary.overdue} vencidas)
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={onAddTransaction}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cargo
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              placeholder="Buscar por descripción, equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 backdrop-blur-md bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] backdrop-blur-md bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/20">
              <SelectItem value="all" className="text-white hover:bg-slate-800">Todos los estados</SelectItem>
              <SelectItem value="pending" className="text-white hover:bg-slate-800">Pendiente</SelectItem>
              <SelectItem value="paid" className="text-white hover:bg-slate-800">Pagado</SelectItem>
              <SelectItem value="partial" className="text-white hover:bg-slate-800">Pago parcial</SelectItem>
              <SelectItem value="overdue" className="text-white hover:bg-slate-800">Vencido</SelectItem>
              <SelectItem value="cancelled" className="text-white hover:bg-slate-800">Cancelado</SelectItem>
              <SelectItem value="waived" className="text-white hover:bg-slate-800">Condonado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px] backdrop-blur-md bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/20">
              <SelectItem value="all" className="text-white hover:bg-slate-800">Todos los tipos</SelectItem>
              <SelectItem value="team_registration" className="text-white hover:bg-slate-800">Inscripción equipo</SelectItem>
              <SelectItem value="player_registration" className="text-white hover:bg-slate-800">Inscripción jugador</SelectItem>
              <SelectItem value="yellow_card_fine" className="text-white hover:bg-slate-800">Multa amarilla</SelectItem>
              <SelectItem value="red_card_fine" className="text-white hover:bg-slate-800">Multa roja</SelectItem>
              <SelectItem value="double_yellow_fine" className="text-white hover:bg-slate-800">Doble amarilla</SelectItem>
              <SelectItem value="absence_fine" className="text-white hover:bg-slate-800">Incomparecencia</SelectItem>
              <SelectItem value="payment_received" className="text-white hover:bg-slate-800">Pago recibido</SelectItem>
              <SelectItem value="refund" className="text-white hover:bg-slate-800">Devolución</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
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
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell className="text-white/80">
                      {new Date(tx.transaction_date).toLocaleDateString("es-ES")}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="text-white font-medium truncate">
                          {tx.description}
                        </p>
                        {tx.player && (
                          <p className="text-xs text-white/50">
                            {tx.player.name} #{tx.player.jersey_number}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-white/80">
                      {tx.team?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-white/60">
                        {TRANSACTION_TYPE_LABELS[tx.transaction_type] ||
                          tx.transaction_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-semibold ${
                          tx.is_income ? "text-emerald-400" : "text-white"
                        }`}
                      >
                        {tx.is_income ? "+" : "-"}
                        {formatCurrency(tx.amount, currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-white/80">
                      {tx.amount_paid > 0
                        ? formatCurrency(tx.amount_paid, currency)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={tx.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(tx.status === "pending" ||
                            tx.status === "partial" ||
                            tx.status === "overdue") &&
                            !tx.is_income && (
                              <DropdownMenuItem
                                onClick={() => handleRegisterPayment(tx)}
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Registrar Pago
                              </DropdownMenuItem>
                            )}
                          <DropdownMenuItem>
                            <FileText className="w-4 h-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                          {tx.status === "pending" && (
                            <DropdownMenuItem className="text-red-400">
                              <X className="w-4 h-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-white/60 py-8"
                  >
                    No se encontraron transacciones
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Payment Form Modal */}
      {showPaymentForm && selectedTransaction && (
        <FinancePaymentForm
          transaction={selectedTransaction}
          config={config}
          onClose={handleClosePaymentForm}
        />
      )}
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

export default FinanceTransactionsTable
