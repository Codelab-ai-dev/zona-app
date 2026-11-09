/** Mirrors the TransactionType / PaymentMethod enums in backend/internal/finance/finance.go (labels from the original app). */

export interface TransactionTypeOption {
  value: string
  label: string
  /** Section of the "Tipo de Transacción" select, as in the original form. */
  section: 'Cuotas' | 'Multas' | 'Operativos' | 'Pagos' | 'Otros'
  /** Charges and fines are billed to a team, so the team is mandatory. */
  needsTeam: boolean
  /** Money coming in (payments, sponsorship...) instead of a charge or an expense. */
  isIncome: boolean
  /** Default description / league-config field used to prefill the form, as in the original. */
  prefill?: { description: string; configKey: string }
}

const income = ['payment_received', 'partial_payment', 'sponsorship', 'other_income', 'prize_money']

export const transactionTypes: TransactionTypeOption[] = [
  { value: 'team_registration', label: 'Inscripción de Equipo', section: 'Cuotas', needsTeam: true, isIncome: false, prefill: { description: 'Cuota de inscripción de equipo', configKey: 'team_registration_fee' } },
  { value: 'player_registration', label: 'Inscripción de Jugador', section: 'Cuotas', needsTeam: true, isIncome: false, prefill: { description: 'Cuota de inscripción de jugador', configKey: 'player_registration_fee' } },
  { value: 'yellow_card_fine', label: 'Multa Tarjeta Amarilla', section: 'Multas', needsTeam: true, isIncome: false, prefill: { description: 'Multa por tarjeta amarilla', configKey: 'yellow_card_fine' } },
  { value: 'red_card_fine', label: 'Multa Tarjeta Roja', section: 'Multas', needsTeam: true, isIncome: false, prefill: { description: 'Multa por tarjeta roja', configKey: 'red_card_fine' } },
  { value: 'double_yellow_fine', label: 'Multa Doble Amarilla', section: 'Multas', needsTeam: true, isIncome: false, prefill: { description: 'Multa por doble amarilla', configKey: 'double_yellow_fine' } },
  { value: 'absence_fine', label: 'Multa por Incomparecencia', section: 'Multas', needsTeam: true, isIncome: false, prefill: { description: 'Multa por incomparecencia', configKey: 'absence_fine' } },
  { value: 'late_arrival_fine', label: 'Multa por Llegada Tarde', section: 'Multas', needsTeam: true, isIncome: false, prefill: { description: 'Multa por llegada tarde', configKey: 'late_arrival_fine' } },
  { value: 'misconduct_fine', label: 'Multa por Mala Conducta', section: 'Multas', needsTeam: true, isIncome: false },
  { value: 'uniform_violation_fine', label: 'Multa por Uniforme', section: 'Multas', needsTeam: true, isIncome: false },
  { value: 'referee_fee', label: 'Pago de Árbitro', section: 'Operativos', needsTeam: false, isIncome: false, prefill: { description: 'Pago de arbitraje', configKey: 'referee_fee_per_match' } },
  { value: 'field_rental', label: 'Renta de Cancha', section: 'Operativos', needsTeam: false, isIncome: false },
  { value: 'equipment_fee', label: 'Equipo/Materiales', section: 'Operativos', needsTeam: false, isIncome: false },
  { value: 'payment_received', label: 'Pago Recibido', section: 'Pagos', needsTeam: false, isIncome: true },
  { value: 'partial_payment', label: 'Pago Parcial', section: 'Pagos', needsTeam: false, isIncome: true },
  { value: 'refund', label: 'Devolución', section: 'Pagos', needsTeam: false, isIncome: false },
  { value: 'discount', label: 'Descuento', section: 'Pagos', needsTeam: false, isIncome: false },
  { value: 'other_income', label: 'Otro Ingreso', section: 'Otros', needsTeam: false, isIncome: true },
  { value: 'sponsorship', label: 'Patrocinio', section: 'Otros', needsTeam: false, isIncome: true },
  { value: 'prize_money', label: 'Premio/Bonificación', section: 'Otros', needsTeam: false, isIncome: true },
  { value: 'other_expense', label: 'Otro Gasto', section: 'Otros', needsTeam: false, isIncome: false },
  { value: 'adjustment', label: 'Ajuste Manual', section: 'Otros', needsTeam: false, isIncome: false },
]

export const typeSections = ['Cuotas', 'Multas', 'Operativos', 'Pagos', 'Otros'] as const

export const isIncomeType = (value: string) => income.includes(value)

export const transactionTypeLabel = (value: string) =>
  transactionTypes.find((t) => t.value === value)?.label ?? value.replace(/_/g, ' ')

export const paymentMethods = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank_transfer', label: 'Transferencia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'oxxo', label: 'OXXO' },
  { value: 'spei', label: 'SPEI' },
  { value: 'other', label: 'Otro' },
]

export const paymentMethodLabel = (value: string) => paymentMethods.find((m) => m.value === value)?.label ?? value

export const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  partial: 'Parcial',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
  waived: 'Condonado',
}

/** Labels of the status filter (the original called "partial" a "Pago parcial" there). */
export const statusFilterLabels: Record<string, string> = { ...statusLabels, partial: 'Pago parcial' }

/** Statuses on which the backend still accepts pay / cancel / waive. */
export const openStatuses = ['pending', 'partial', 'overdue']
