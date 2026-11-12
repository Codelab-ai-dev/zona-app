import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { statementCsv } from '../components/statement-csv'
import { financeConfig, list, mineOne, summary, transaction } from '../test-fixtures'
import type { TeamBalance } from '../types'
import { FinancePageComponent } from './finance'

const L = '/leagues/league-1/finance'
const txList = `GET ${L}/transactions`
const balances = `GET ${L}/balances`
const base = { ...mineOne, [`GET ${L}/summary`]: { body: summary }, 'GET /teams': list([]) }
const balance = (over: Partial<TeamBalance>): TeamBalance => ({
  team_id: 'team-1',
  team_name: 'Tigres',
  team_slug: 'tigres',
  league_id: 'league-1',
  league_name: 'Liga Norte',
  total_charges: '3000.00',
  total_paid: '1000.00',
  balance: '2000.00',
  pending_balance: '2000.00',
  overdue_count: 0,
  pending_fines_count: 0,
  ...over,
})

describe('Finance parity: payment dialog', () => {
  const pay = `POST ${L}/transactions/tx-1/pay`
  async function openPay() {
    const view = renderWithProviders(<FinancePageComponent />)
    await view.user.click(await screen.findByRole('tab', { name: 'Transacciones' }))
    await view.user.click(await screen.findByRole('button', { name: 'Acciones de Inscripción Tigres' }))
    await view.user.click(await screen.findByRole('menuitem', { name: 'Registrar Pago' }))
    return { ...view, dialog: await screen.findByRole('dialog') }
  }

  it('summarises the charge and says whether the payment is full or partial', async () => {
    mockApi({ ...base, [txList]: list([transaction()]) })
    const { user, dialog } = await openPay()

    expect(within(dialog).getByText('Registrar pago para: Inscripción Tigres')).toBeInTheDocument()
    expect(within(dialog).getByText('Monto Total:').nextSibling).toHaveTextContent('$1,500.50')
    expect(within(dialog).getByText('Ya Pagado:').nextSibling).toHaveTextContent('$500.00')
    expect(within(dialog).getByText('Pendiente:').nextSibling).toHaveTextContent('$1,000.50')
    expect(within(dialog).getByText('Pago completo - se marcará como pagado')).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText('Monto a Pagar (MXN)'))
    await user.type(within(dialog).getByLabelText('Monto a Pagar (MXN)'), '400')
    expect(within(dialog).getByText('Pago parcial - quedarán $600.50 pendientes')).toBeInTheDocument()
  })

  it('registers a partial payment: toast says partial and the body carries the typed amount', async () => {
    const fetchMock = mockApi({ ...base, [txList]: list([transaction()]), [pay]: { body: transaction({ status: 'partial', amount_paid: '900.00' }) } })
    const { user, dialog } = await openPay()

    await user.clear(within(dialog).getByLabelText('Monto a Pagar (MXN)'))
    await user.type(within(dialog).getByLabelText('Monto a Pagar (MXN)'), '400')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar Pago' }))

    expect(await screen.findByText('Pago parcial registrado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, pay)).toEqual([{ amount: '400.00', payment_method: 'cash' }])
  })

  it('never overpays: an amount above the pending balance is capped to it', async () => {
    const fetchMock = mockApi({ ...base, [txList]: list([transaction()]), [pay]: { body: transaction({ status: 'paid' }) } })
    const { user, dialog } = await openPay()

    await user.clear(within(dialog).getByLabelText('Monto a Pagar (MXN)'))
    await user.type(within(dialog).getByLabelText('Monto a Pagar (MXN)'), '5000')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar Pago' }))

    expect(await screen.findByText('Pago completo registrado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, pay)).toEqual([{ amount: '1000.50', payment_method: 'cash' }])
  })

  it('sends nothing when the dialog is cancelled', async () => {
    const fetchMock = mockApi({ ...base, [txList]: list([transaction()]) })
    const { user, dialog } = await openPay()

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, pay)).toEqual([])
  })
})

describe('Finance parity: transaction details', () => {
  it('shows due date, payment method, reference and receipt of a paid charge', async () => {
    mockApi({
      ...base,
      [txList]: list([
        transaction({ status: 'paid', due_date: '2026-03-15T00:00:00Z', payment_method: 'spei', payment_reference: 'REF-77', receipt_number: 'R-0001', notes: 'Pagó el capitán' }),
      ]),
    })
    const { user } = renderWithProviders(<FinancePageComponent />)
    await user.click(await screen.findByRole('tab', { name: 'Transacciones' }))
    await user.click(await screen.findByRole('button', { name: 'Acciones de Inscripción Tigres' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Ver Detalles' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('SPEI')).toBeInTheDocument()
    expect(within(dialog).getByText('REF-77')).toBeInTheDocument()
    expect(within(dialog).getByText('R-0001')).toBeInTheDocument()
    expect(within(dialog).getByText('Pagó el capitán')).toBeInTheDocument()
    expect(within(dialog).getByText('Vencimiento')).toBeInTheDocument()
  })
})

describe('Finance parity: Balance por Equipo', () => {
  const rows = [
    balance({ team_id: 'team-2', team_name: 'Leones', total_charges: '500.00', total_paid: '500.00', pending_balance: '0.00', balance: '0.00' }),
    balance({ pending_fines_count: 2, overdue_count: 1, pending_balance: '2000.00' }),
    balance({ team_id: 'team-3', team_name: 'Águilas', pending_balance: '300.50' }),
  ]
  async function openBalances() {
    const view = renderWithProviders(<FinancePageComponent />)
    await view.user.click(await screen.findByRole('tab', { name: 'Equipos' }))
    return view
  }

  it('summarises the teams, sorts by debt and flags each team status', async () => {
    mockApi({ ...base, [txList]: list([]), [balances]: list(rows) })
    await openBalances()

    expect(await screen.findByText('Balance por Equipo')).toBeInTheDocument()
    expect(screen.getByText(/^3 equipos -/)).toBeInTheDocument()
    expect(screen.getByText('1 al corriente')).toBeInTheDocument()
    expect(screen.getByText(/2 con deuda/)).toBeInTheDocument()
    expect(screen.getByText('$2,300.50')).toBeInTheDocument() // Total Pendiente
    const names = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0]?.textContent)
    expect(names).toEqual(['TTigres2 multa(s) pendiente(s)', 'ÁÁguilas', 'LLeones'])
    const tigres = screen.getByText('Tigres').closest('tr') as HTMLElement
    expect(within(tigres).getByText('1 vencido(s)')).toBeInTheDocument()
    expect(within(tigres).getByText(/^-\s*\$2,000\.00$/)).toBeInTheDocument()
    expect(within(screen.getByText('Águilas').closest('tr') as HTMLElement).getByText('Con deuda')).toBeInTheDocument()
    expect(within(screen.getByText('Leones').closest('tr') as HTMLElement).getByText('Al corriente')).toBeInTheDocument()
  })

  it('filters by name and says when nothing matches', async () => {
    mockApi({ ...base, [txList]: list([]), [balances]: list(rows) })
    const { user } = await openBalances()

    await user.type(await screen.findByLabelText('Buscar equipo'), 'zzz')

    expect(screen.getByText('No se encontraron equipos')).toBeInTheDocument()
  })

  it('downloads the statement of a team as CSV from "Generar Estado de Cuenta"', async () => {
    const created: Blob[] = []
    Object.assign(URL, { createObjectURL: (blob: Blob) => (created.push(blob), 'blob:statement'), revokeObjectURL: () => undefined })
    mockApi({
      ...base,
      [txList]: list([]),
      [balances]: list(rows),
      [`GET ${L}/teams/team-1/balance`]: { body: rows[1] },
      [`GET ${L}/teams/team-1/transactions`]: list([transaction({ description: 'Cuota "abril"', receipt_number: 'R-9' })]),
    })
    const { user } = await openBalances()

    await user.click(await screen.findByRole('button', { name: 'Ver estado de cuenta de Tigres' }))
    const dialog = await screen.findByRole('dialog')
    const generate = within(dialog).getByRole('button', { name: 'Generar Estado de Cuenta' })
    await waitFor(() => expect(generate).toBeEnabled())
    await user.click(generate)

    expect(created).toHaveLength(1)
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsText(created[0]!)
    })
    expect(text).toContain('"Fecha","Descripción","Tipo","Monto","Pagado","Estado","Vencimiento","Recibo"')
    expect(text).toContain('"Cuota ""abril"""')
    expect(text).toContain('"R-9"')
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Finance parity: currency and CSV', () => {
  it('shows the amounts in the currency of the league config', async () => {
    mockApi({ ...base, [`GET ${L}/config`]: { body: { ...financeConfig, currency: 'USD' } }, [txList]: list([]), [balances]: list([]) })
    renderWithProviders(<FinancePageComponent />)

    expect(await screen.findByText(/US\$1,800\.50/)).toBeInTheDocument()
  })

  it('writes incomes without sign, charges with "-", and escapes quotes', () => {
    const csv = statementCsv([transaction({ is_income: true, description: 'Pago "x"', amount: '10.50', amount_paid: '10.50', status: 'paid' })])
    expect(csv).toContain('"10.50","10.50","Pagado"')
    expect(csv).toContain('"Pago ""x"""')
    expect(statementCsv([transaction()])).toContain('"-1500.50","500.00","Parcial"')
  })
})
