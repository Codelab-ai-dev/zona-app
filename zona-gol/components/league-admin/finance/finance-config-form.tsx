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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Settings, DollarSign, AlertTriangle, Bell } from "lucide-react"
import { toast } from "sonner"
import {
  useCreateFinanceConfig,
  useUpdateFinanceConfig,
} from "@/lib/queries/use-finance-query"
import { useAuthStore } from "@/lib/stores/auth-store"
import type { FinanceConfig, FinanceCurrency } from "@/lib/types/finance"

// Form schema
const configSchema = z.object({
  // Registration fees
  team_registration_fee: z.coerce.number().min(0),
  player_registration_fee: z.coerce.number().min(0),
  late_registration_surcharge: z.coerce.number().min(0),

  // Card fines
  yellow_card_fine: z.coerce.number().min(0),
  red_card_fine: z.coerce.number().min(0),
  double_yellow_fine: z.coerce.number().min(0),

  // Other fines
  absence_fine: z.coerce.number().min(0),
  late_arrival_fine: z.coerce.number().min(0),
  misconduct_fine: z.coerce.number().min(0),

  // Operational
  referee_fee_per_match: z.coerce.number().min(0),
  assistant_referee_fee: z.coerce.number().min(0),
  field_rental_per_match: z.coerce.number().min(0),

  // Settings
  currency: z.string(),
  payment_due_days: z.coerce.number().min(0).max(90),
  overdue_grace_days: z.coerce.number().min(0).max(30),

  // Automation
  auto_generate_fines: z.boolean(),
  auto_generate_referee_fees: z.boolean(),
  notify_on_new_charge: z.boolean(),
  notify_on_overdue: z.boolean(),
})

type ConfigFormData = z.infer<typeof configSchema>

interface FinanceConfigFormProps {
  leagueId: string
  config: FinanceConfig | null
  onClose: () => void
}

export function FinanceConfigForm({
  leagueId,
  config,
  onClose,
}: FinanceConfigFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("fees")
  const { user } = useAuthStore()
  const createConfig = useCreateFinanceConfig()
  const updateConfig = useUpdateFinanceConfig()

  const isEditing = !!config

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      team_registration_fee: config?.team_registration_fee || 0,
      player_registration_fee: config?.player_registration_fee || 0,
      late_registration_surcharge: config?.late_registration_surcharge || 0,

      yellow_card_fine: config?.yellow_card_fine || 50,
      red_card_fine: config?.red_card_fine || 150,
      double_yellow_fine: config?.double_yellow_fine || 100,

      absence_fine: config?.absence_fine || 500,
      late_arrival_fine: config?.late_arrival_fine || 100,
      misconduct_fine: config?.misconduct_fine || 200,

      referee_fee_per_match: config?.referee_fee_per_match || 300,
      assistant_referee_fee: config?.assistant_referee_fee || 150,
      field_rental_per_match: config?.field_rental_per_match || 0,

      currency: config?.currency || "MXN",
      payment_due_days: config?.payment_due_days || 7,
      overdue_grace_days: config?.overdue_grace_days || 3,

      auto_generate_fines: config?.auto_generate_fines ?? true,
      auto_generate_referee_fees: config?.auto_generate_referee_fees ?? false,
      notify_on_new_charge: config?.notify_on_new_charge ?? true,
      notify_on_overdue: config?.notify_on_overdue ?? true,
    },
  })

  const onSubmit = async (data: ConfigFormData) => {
    setIsSubmitting(true)

    try {
      if (isEditing && config) {
        await updateConfig.mutateAsync({
          configId: config.id,
          updates: {
            ...data,
            currency: data.currency as FinanceCurrency,
            updated_by: user?.id || null,
          },
          leagueId,
        })
        toast.success("Configuración actualizada exitosamente")
      } else {
        await createConfig.mutateAsync({
          league_id: leagueId,
          tournament_id: null,
          name: "default",
          ...data,
          currency: data.currency as FinanceCurrency,
          uniform_violation_fine: 0,
          payment_instructions: null,
          bank_account_info: null,
          is_active: true,
          created_by: user?.id || null,
          updated_by: null,
        })
        toast.success("Configuración creada exitosamente")
      }
      onClose()
    } catch (error) {
      console.error("Error saving config:", error)
      toast.error("Error al guardar la configuración")
    } finally {
      setIsSubmitting(false)
    }
  }

  const currency = form.watch("currency")

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Configuración Financiera
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Define las tarifas, multas y opciones de tu liga
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-white/10 border border-white/20">
                <TabsTrigger
                  value="fees"
                  className="flex-1 data-[state=active]:bg-white/20"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Cuotas
                </TabsTrigger>
                <TabsTrigger
                  value="fines"
                  className="flex-1 data-[state=active]:bg-white/20"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Multas
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex-1 data-[state=active]:bg-white/20"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Opciones
                </TabsTrigger>
              </TabsList>

              {/* Fees Tab */}
              <TabsContent value="fees" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="team_registration_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/90">
                          Inscripción Equipo ({currency})
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="player_registration_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/90">
                          Inscripción Jugador ({currency})
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="referee_fee_per_match"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/90">
                          Arbitraje por Partido ({currency})
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="field_rental_per_match"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/90">
                          Renta Cancha ({currency})
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Fines Tab */}
              <TabsContent value="fines" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-white/70">
                    Multas por Tarjetas
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="yellow_card_fine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/90 flex items-center gap-2">
                            <span className="w-3 h-3 bg-yellow-400 rounded-sm" />
                            Amarilla
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="double_yellow_fine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/90 flex items-center gap-2">
                            <span className="w-3 h-3 bg-orange-400 rounded-sm" />
                            Doble Amarilla
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="red_card_fine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/90 flex items-center gap-2">
                            <span className="w-3 h-3 bg-red-500 rounded-sm" />
                            Roja
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-white/70">Otras Multas</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="absence_fine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/90">
                            Incomparecencia
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="late_arrival_fine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/90">
                            Llegada Tarde
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="misconduct_fine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/90">
                            Mala Conducta
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/90">Moneda</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-900 border-white/20">
                            <SelectItem value="MXN" className="text-white hover:bg-slate-800">MXN - Peso Mexicano</SelectItem>
                            <SelectItem value="USD" className="text-white hover:bg-slate-800">USD - Dólar</SelectItem>
                            <SelectItem value="EUR" className="text-white hover:bg-slate-800">EUR - Euro</SelectItem>
                            <SelectItem value="COP" className="text-white hover:bg-slate-800">COP - Peso Colombiano</SelectItem>
                            <SelectItem value="ARS" className="text-white hover:bg-slate-800">ARS - Peso Argentino</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_due_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/90">
                          Días para Pago
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="90"
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </FormControl>
                        <FormDescription className="text-white/50 text-xs">
                          Días después del cargo para el vencimiento
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-white/70">Automatización</h4>

                  <FormField
                    control={form.control}
                    name="auto_generate_fines"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                          <FormLabel className="text-white/90">
                            Generar multas automáticamente
                          </FormLabel>
                          <FormDescription className="text-white/50 text-xs">
                            Crea multas cuando se registran tarjetas en partidos
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notify_on_new_charge"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                          <FormLabel className="text-white/90">
                            Notificar nuevos cargos
                          </FormLabel>
                          <FormDescription className="text-white/50 text-xs">
                            Envía notificación cuando se genera un nuevo cargo
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notify_on_overdue"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                          <FormLabel className="text-white/90">
                            Notificar pagos vencidos
                          </FormLabel>
                          <FormDescription className="text-white/50 text-xs">
                            Envía recordatorio cuando un pago se vence
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4 border-t border-white/10">
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
                {isEditing ? "Guardar Cambios" : "Crear Configuración"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default FinanceConfigForm
