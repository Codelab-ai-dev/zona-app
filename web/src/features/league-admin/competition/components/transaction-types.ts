/** Mirrors the TransactionType / PaymentMethod enums in backend/internal/finance/finance.go. */

export interface TransactionTypeOption {
  value: string
  label: string
  group: 'charge' | 'income' | 'expense'
  /** Charges and fines are billed to a team, so the team is mandatory. */
  needsTeam: boolean
}

export const transactionTypes: TransactionTypeOption[] = [
  { value: 'team_registration', label: 'Inscripción de equipo', group: 'charge', needsTeam: true },
  { value: 'player_registration', label: 'Inscripción de jugador', group: 'charge', needsTeam: true },
  { value: 'yellow_card_fine', label: 'Multa por tarjeta amarilla', group: 'charge', needsTeam: true },
  { value: 'red_card_fine', label: 'Multa por tarjeta roja', group: 'charge', needsTeam: true },
  { value: 'double_yellow_fine', label: 'Multa por doble amarilla', group: 'charge', needsTeam: true },
  { value: 'absence_fine', label: 'Multa por inasistencia', group: 'charge', needsTeam: true },
  { value: 'late_arrival_fine', label: 'Multa por llegada tarde', group: 'charge', needsTeam: true },
  { value: 'misconduct_fine', label: 'Multa por mala conducta', group: 'charge', needsTeam: true },
  { value: 'uniform_violation_fine', label: 'Multa por uniforme', group: 'charge', needsTeam: true },
  { value: 'referee_fee', label: 'Honorarios de árbitro', group: 'expense', needsTeam: false },
  { value: 'field_rental', label: 'Renta de cancha', group: 'expense', needsTeam: false },
  { value: 'equipment_fee', label: 'Equipamiento', group: 'expense', needsTeam: false },
  { value: 'other_expense', label: 'Otro gasto', group: 'expense', needsTeam: false },
  { value: 'payment_received', label: 'Pago recibido', group: 'income', needsTeam: false },
  { value: 'partial_payment', label: 'Pago parcial', group: 'income', needsTeam: false },
  { value: 'sponsorship', label: 'Patrocinio', group: 'income', needsTeam: false },
  { value: 'prize_money', label: 'Premio', group: 'income', needsTeam: false },
  { value: 'other_income', label: 'Otro ingreso', group: 'income', needsTeam: false },
  { value: 'refund', label: 'Reembolso', group: 'income', needsTeam: false },
  { value: 'discount', label: 'Descuento', group: 'income', needsTeam: false },
  { value: 'adjustment', label: 'Ajuste', group: 'income', needsTeam: false },
]

export const transactionTypeLabel = (value: string) =>
  transactionTypes.find((t) => t.value === value)?.label ?? value.replace(/_/g, ' ')

export const paymentMethods = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'spei', label: 'SPEI' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'oxxo', label: 'OXXO' },
  { value: 'other', label: 'Otro' },
]

export const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  partial: 'Parcial',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
  waived: 'Condonado',
}

/** Statuses on which the backend still accepts pay / cancel / waive. */
export const openStatuses = ['pending', 'partial', 'overdue']
