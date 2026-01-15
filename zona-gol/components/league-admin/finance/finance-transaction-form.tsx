"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { useCreateFinanceTransaction } from "@/lib/queries/use-finance-query"
import { useTeamsByLeague } from "@/lib/queries"
import { useAuthStore } from "@/lib/stores/auth-store"
import type { FinanceConfig, FinanceTransactionType } from "@/lib/types/finance"
import { TRANSACTION_TYPE_LABELS, isIncomeType } from "@/lib/types/finance"

// Form schema
const transactionSchema = z.object({
  team_id: z.string().min(1, "Selecciona un equipo"),
  transaction_type: z.string().min(1, "Selecciona un tipo"),
  description: z.string().min(3, "La descripción debe tener al menos 3 caracteres"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  due_date: z.string().optional(),
  notes: z.string().optional(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

interface FinanceTransactionFormProps {
  leagueId: string
  config: FinanceConfig | null
  onClose: () => void
}

export function FinanceTransactionForm({
  leagueId,
  config,
  onClose,
}: FinanceTransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuthStore()
  const { data: teams = [] } = useTeamsByLeague(leagueId)
  const createTransaction = useCreateFinanceTransaction()

  // Default due date (7 days from now)
  const defaultDueDate = new Date()
  defaultDueDate.setDate(defaultDueDate.getDate() + (config?.payment_due_days || 7))

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      team_id: "",
      transaction_type: "",
      description: "",
      amount: 0,
      due_date: defaultDueDate.toISOString().split("T")[0],
      notes: "",
    },
  })

  const selectedType = form.watch("transaction_type") as FinanceTransactionType

  // Auto-fill amount based on type
  const handleTypeChange = (type: string) => {
    form.setValue("transaction_type", type)

    // Auto-fill description and amount based on type
    if (config) {
      const typeConfig: Record<string, { description: string; amount: number }> = {
        team_registration: {
          description: "Cuota de inscripción de equipo",
          amount: config.team_registration_fee,
        },
        player_registration: {
          description: "Cuota de inscripción de jugador",
          amount: config.player_registration_fee,
        },
        yellow_card_fine: {
          description: "Multa por tarjeta amarilla",
          amount: config.yellow_card_fine,
        },
        red_card_fine: {
          description: "Multa por tarjeta roja",
          amount: config.red_card_fine,
        },
        double_yellow_fine: {
          description: "Multa por doble amarilla",
          amount: config.double_yellow_fine,
        },
        absence_fine: {
          description: "Multa por incomparecencia",
          amount: config.absence_fine,
        },
        late_arrival_fine: {
          description: "Multa por llegada tarde",
          amount: config.late_arrival_fine,
        },
        referee_fee: {
          description: "Pago de arbitraje",
          amount: config.referee_fee_per_match,
        },
      }

      const typeData = typeConfig[type]
      if (typeData) {
        form.setValue("description", typeData.description)
        if (typeData.amount > 0) {
          form.setValue("amount", typeData.amount)
        }
      }
    }
  }

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true)

    try {
      const isIncome = isIncomeType(data.transaction_type as FinanceTransactionType)

      await createTransaction.mutateAsync({
        league_id: leagueId,
        team_id: data.team_id,
        tournament_id: null,
        player_id: null,
        match_id: null,
        transaction_type: data.transaction_type as FinanceTransactionType,
        description: data.description,
        amount: data.amount,
        is_income: isIncome,
        transaction_date: new Date().toISOString().split("T")[0],
        due_date: data.due_date || null,
        notes: data.notes || null,
        payment_method: null,
        payment_reference: null,
        receipt_number: null,
        external_payment_id: null,
        external_payment_status: null,
        external_payment_data: null,
        auto_generated: false,
        source_stat_id: null,
        parent_transaction_id: null,
        created_by: user?.id || null,
        updated_by: null,
        cancelled_by: null,
        cancelled_at: null,
        cancellation_reason: null,
      })

      toast.success("Transacción creada exitosamente")
      onClose()
    } catch (error) {
      console.error("Error creating transaction:", error)
      toast.error("Error al crear la transacción")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Transaction types grouped
  const transactionTypes = [
    { group: "Cuotas", types: ["team_registration", "player_registration"] },
    {
      group: "Multas",
      types: [
        "yellow_card_fine",
        "red_card_fine",
        "double_yellow_fine",
        "absence_fine",
        "late_arrival_fine",
        "misconduct_fine",
      ],
    },
    { group: "Operativos", types: ["referee_fee", "field_rental", "equipment_fee"] },
    { group: "Pagos", types: ["payment_received", "refund", "discount"] },
    { group: "Otros", types: ["other_income", "other_expense", "adjustment"] },
  ]

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            Nueva Transacción
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Registra un cargo, multa o pago
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Team */}
            <FormField
              control={form.control}
              name="team_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/90">Equipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Seleccionar equipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-900 border-white/20">
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id} className="text-white hover:bg-slate-800">
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/90">Tipo de Transacción</FormLabel>
                  <Select onValueChange={handleTypeChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-900 border-white/20">
                      {transactionTypes.map((group) => (
                        <div key={group.group}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-white/50">
                            {group.group}
                          </div>
                          {group.types.map((type) => (
                            <SelectItem key={type} value={type} className="text-white hover:bg-slate-800">
                              {TRANSACTION_TYPE_LABELS[type as FinanceTransactionType] ||
                                type}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/90">Descripción</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Describe la transacción"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/90">Monto ({config?.currency || "MXN"})</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Due Date (only for charges) */}
            {selectedType && !isIncomeType(selectedType) && (
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/90">Fecha de Vencimiento</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </FormControl>
                    <FormDescription className="text-white/50 text-xs">
                      Fecha límite para el pago
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/90">Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Notas adicionales..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear Transacción
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default FinanceTransactionForm
