/**
 * Finance Module Types
 *
 * Type definitions for the finance/accounting module
 */

// =====================================================
// ENUMS (matching database enums)
// =====================================================

export type FinanceTransactionType =
  // Cuotas de inscripción
  | 'team_registration'
  | 'player_registration'
  // Multas por tarjetas
  | 'yellow_card_fine'
  | 'red_card_fine'
  | 'double_yellow_fine'
  // Otras multas
  | 'absence_fine'
  | 'late_arrival_fine'
  | 'misconduct_fine'
  | 'uniform_violation_fine'
  // Costos operativos
  | 'referee_fee'
  | 'field_rental'
  | 'equipment_fee'
  // Pagos y ajustes
  | 'payment_received'
  | 'partial_payment'
  | 'refund'
  | 'discount'
  | 'adjustment'
  // Otros
  | 'other_income'
  | 'other_expense'
  | 'sponsorship'
  | 'prize_money'

export type FinanceTransactionStatus =
  | 'pending'
  | 'paid'
  | 'partial'
  | 'overdue'
  | 'cancelled'
  | 'waived'

export type FinancePaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'card'
  | 'mercadopago'
  | 'stripe'
  | 'paypal'
  | 'oxxo'
  | 'spei'
  | 'other'

export type FinanceCurrency = 'MXN' | 'USD' | 'EUR' | 'COP' | 'ARS' | 'CLP' | 'PEN'

// =====================================================
// CONFIGURATION
// =====================================================

export interface FinanceConfig {
  id: string
  league_id: string
  tournament_id: string | null
  name: string

  // Cuotas de inscripción
  team_registration_fee: number
  player_registration_fee: number
  late_registration_surcharge: number

  // Multas por tarjetas
  yellow_card_fine: number
  red_card_fine: number
  double_yellow_fine: number

  // Otras multas
  absence_fine: number
  late_arrival_fine: number
  misconduct_fine: number
  uniform_violation_fine: number

  // Costos por partido
  referee_fee_per_match: number
  assistant_referee_fee: number
  field_rental_per_match: number

  // Configuración general
  currency: FinanceCurrency
  payment_due_days: number
  auto_generate_fines: boolean
  auto_generate_referee_fees: boolean
  notify_on_new_charge: boolean
  notify_on_overdue: boolean
  overdue_grace_days: number

  // Información de pago
  payment_instructions: string | null
  bank_account_info: string | null

  is_active: boolean
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type FinanceConfigInsert = Omit<FinanceConfig, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

export type FinanceConfigUpdate = Partial<Omit<FinanceConfig, 'id' | 'league_id' | 'created_at'>>

// =====================================================
// TRANSACTIONS
// =====================================================

export interface FinanceTransaction {
  id: string
  league_id: string
  tournament_id: string | null
  team_id: string | null
  player_id: string | null
  match_id: string | null

  transaction_type: FinanceTransactionType
  description: string
  notes: string | null

  amount: number
  amount_paid: number
  is_income: boolean

  transaction_date: string
  due_date: string | null
  paid_at: string | null
  status: FinanceTransactionStatus

  payment_method: FinancePaymentMethod | null
  payment_reference: string | null
  receipt_number: string | null

  external_payment_id: string | null
  external_payment_status: string | null
  external_payment_data: Record<string, unknown> | null

  auto_generated: boolean
  source_stat_id: string | null
  parent_transaction_id: string | null

  created_by: string | null
  updated_by: string | null
  cancelled_by: string | null
  cancelled_at: string | null
  cancellation_reason: string | null

  created_at: string
  updated_at: string
}

export type FinanceTransactionInsert = Omit<
  FinanceTransaction,
  'id' | 'created_at' | 'updated_at' | 'amount_paid' | 'status' | 'paid_at'
> & {
  id?: string
  amount_paid?: number
  status?: FinanceTransactionStatus
}

export type FinanceTransactionUpdate = Partial<
  Omit<FinanceTransaction, 'id' | 'league_id' | 'created_at' | 'auto_generated' | 'source_stat_id'>
>

// =====================================================
// VIEWS / AGGREGATED DATA
// =====================================================

export interface FinanceTeamBalance {
  team_id: string
  team_name: string
  team_slug: string
  team_logo: string | null
  league_id: string
  league_name: string
  tournament_id: string | null

  total_charges: number
  total_paid: number
  balance: number // negative = debt, positive = credit
  pending_balance: number
  overdue_count: number
  pending_fines_count: number
  last_transaction_at: string | null
}

export interface FinanceLeagueSummary {
  league_id: string
  league_name: string
  league_slug: string

  total_income: number
  total_charges: number
  total_collected: number
  total_pending: number
  total_overdue: number

  teams_with_transactions: number
  total_transactions: number
  overdue_transactions: number
  total_card_fines: number

  first_transaction_date: string | null
  last_transaction_date: string | null
}

// =====================================================
// TRANSACTION WITH RELATIONS (for display)
// =====================================================

export interface FinanceTransactionWithRelations extends FinanceTransaction {
  team?: {
    id: string
    name: string
    slug: string
    logo: string | null
  } | null
  player?: {
    id: string
    name: string
    jersey_number: number | null
  } | null
  match?: {
    id: string
    match_date: string
    home_team: { name: string }
    away_team: { name: string }
  } | null
  created_by_user?: {
    id: string
    full_name: string | null
  } | null
}

// =====================================================
// FORM / UI TYPES
// =====================================================

export interface CreateTransactionFormData {
  team_id: string
  player_id?: string
  transaction_type: FinanceTransactionType
  description: string
  amount: number
  due_date?: string
  notes?: string
}

export interface RegisterPaymentFormData {
  transaction_id: string
  amount: number
  payment_method: FinancePaymentMethod
  payment_reference?: string
}

export interface FinanceFilters {
  status?: FinanceTransactionStatus | 'all'
  transaction_type?: FinanceTransactionType | 'all'
  team_id?: string
  date_from?: string
  date_to?: string
  is_income?: boolean
}

// =====================================================
// LABELS AND DISPLAY HELPERS
// =====================================================

export const TRANSACTION_TYPE_LABELS: Record<FinanceTransactionType, string> = {
  team_registration: 'Inscripción de Equipo',
  player_registration: 'Inscripción de Jugador',
  yellow_card_fine: 'Multa Tarjeta Amarilla',
  red_card_fine: 'Multa Tarjeta Roja',
  double_yellow_fine: 'Multa Doble Amarilla',
  absence_fine: 'Multa por Incomparecencia',
  late_arrival_fine: 'Multa por Llegada Tarde',
  misconduct_fine: 'Multa por Mala Conducta',
  uniform_violation_fine: 'Multa por Uniforme',
  referee_fee: 'Pago de Árbitro',
  field_rental: 'Renta de Cancha',
  equipment_fee: 'Equipo/Materiales',
  payment_received: 'Pago Recibido',
  partial_payment: 'Pago Parcial',
  refund: 'Devolución',
  discount: 'Descuento',
  adjustment: 'Ajuste Manual',
  other_income: 'Otro Ingreso',
  other_expense: 'Otro Gasto',
  sponsorship: 'Patrocinio',
  prize_money: 'Premio/Bonificación',
}

export const TRANSACTION_STATUS_LABELS: Record<FinanceTransactionStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  partial: 'Pago Parcial',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
  waived: 'Condonado',
}

export const PAYMENT_METHOD_LABELS: Record<FinancePaymentMethod, string> = {
  cash: 'Efectivo',
  bank_transfer: 'Transferencia',
  card: 'Tarjeta',
  mercadopago: 'MercadoPago',
  stripe: 'Stripe',
  paypal: 'PayPal',
  oxxo: 'OXXO',
  spei: 'SPEI',
  other: 'Otro',
}

export const CURRENCY_SYMBOLS: Record<FinanceCurrency, string> = {
  MXN: '$',
  USD: 'US$',
  EUR: '€',
  COP: 'COP$',
  ARS: 'AR$',
  CLP: 'CLP$',
  PEN: 'S/',
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Determines if a transaction type is a charge (debt) or income
 */
export function isIncomeType(type: FinanceTransactionType): boolean {
  return [
    'payment_received',
    'partial_payment',
    'sponsorship',
    'other_income',
    'prize_money',
  ].includes(type)
}

/**
 * Determines if a transaction type is a fine
 */
export function isFineType(type: FinanceTransactionType): boolean {
  return [
    'yellow_card_fine',
    'red_card_fine',
    'double_yellow_fine',
    'absence_fine',
    'late_arrival_fine',
    'misconduct_fine',
    'uniform_violation_fine',
  ].includes(type)
}

/**
 * Gets the color class for a transaction status
 */
export function getStatusColor(status: FinanceTransactionStatus): string {
  const colors: Record<FinanceTransactionStatus, string> = {
    pending: 'text-yellow-500 bg-yellow-500/10',
    paid: 'text-green-500 bg-green-500/10',
    partial: 'text-blue-500 bg-blue-500/10',
    overdue: 'text-red-500 bg-red-500/10',
    cancelled: 'text-gray-500 bg-gray-500/10',
    waived: 'text-purple-500 bg-purple-500/10',
  }
  return colors[status]
}

/**
 * Formats currency amount
 */
export function formatCurrency(amount: number, currency: FinanceCurrency = 'MXN'): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  return `${symbol}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
