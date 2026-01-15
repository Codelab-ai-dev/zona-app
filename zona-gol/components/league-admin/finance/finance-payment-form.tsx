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
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useRegisterPayment } from "@/lib/queries/use-finance-query"
import { useAuthStore } from "@/lib/stores/auth-store"
import type {
  FinanceTransactionWithRelations,
  FinanceConfig,
  FinancePaymentMethod,
} from "@/lib/types/finance"
import { formatCurrency, PAYMENT_METHOD_LABELS } from "@/lib/types/finance"

// Form schema
const paymentSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  payment_method: z.string().min(1, "Selecciona un método de pago"),
  payment_reference: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface FinancePaymentFormProps {
  transaction: FinanceTransactionWithRelations
  config: FinanceConfig | null
  onClose: () => void
}

export function FinancePaymentForm({
  transaction,
  config,
  onClose,
}: FinancePaymentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuthStore()
  const registerPayment = useRegisterPayment()

  const currency = config?.currency || "MXN"
  const pendingAmount = transaction.amount - transaction.amount_paid

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: pendingAmount,
      payment_method: "cash",
      payment_reference: "",
    },
  })

  const enteredAmount = form.watch("amount")
  const isFullPayment = enteredAmount >= pendingAmount

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true)

    try {
      await registerPayment.mutateAsync({
        transactionId: transaction.id,
        amount: Math.min(data.amount, pendingAmount), // Don't overpay
        paymentMethod: data.payment_method as FinancePaymentMethod,
        paymentReference: data.payment_reference || undefined,
        paidBy: user?.id || "",
        leagueId: transaction.league_id,
        teamId: transaction.team_id,
      })

      toast.success(
        isFullPayment
          ? "Pago completo registrado exitosamente"
          : "Pago parcial registrado exitosamente"
      )
      onClose()
    } catch (error) {
      console.error("Error registering payment:", error)
      toast.error("Error al registrar el pago")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Registrar pago para: {transaction.description}
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Summary */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Equipo:</span>
            <span className="text-white font-medium">
              {transaction.team?.name || "Sin equipo"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Monto Total:</span>
            <span className="text-white font-medium">
              {formatCurrency(transaction.amount, currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Ya Pagado:</span>
            <span className="text-emerald-400 font-medium">
              {formatCurrency(transaction.amount_paid, currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-white/10">
            <span className="text-white/80 font-medium">Pendiente:</span>
            <span className="text-white font-bold">
              {formatCurrency(pendingAmount, currency)}
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/90">
                    Monto a Pagar ({currency})
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={pendingAmount}
                      placeholder="0.00"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </FormControl>
                  <FormDescription className="text-white/50 text-xs flex items-center gap-2">
                    {isFullPayment ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">
                          Pago completo - se marcará como pagado
                        </span>
                      </>
                    ) : (
                      <>
                        Pago parcial - quedarán{" "}
                        {formatCurrency(pendingAmount - (enteredAmount || 0), currency)}{" "}
                        pendientes
                      </>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/90">Método de Pago</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-900 border-white/20">
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-white hover:bg-slate-800">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Reference */}
            <FormField
              control={form.control}
              name="payment_reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/90">
                    Referencia (opcional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Número de transferencia, folio..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </FormControl>
                  <FormDescription className="text-white/50 text-xs">
                    Número de referencia, folio o comprobante
                  </FormDescription>
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
                Registrar Pago
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default FinancePaymentForm
