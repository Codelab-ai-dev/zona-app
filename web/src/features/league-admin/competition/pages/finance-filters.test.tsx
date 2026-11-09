import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import type { TeamBalance } from '../types'
import { apiError, list, mineOne, summary, transaction } from '../test-fixtures'
import { FinancePageComponent } from './finance'

const txList = 'GET /leagues/league-1/finance/transactions'
const teamTx = 'GET /leagues/league-1/finance/teams/team-1/transactions'
const teamBal = 'GET /leagues/league-1/finance/teams/team-1/balance'
const base = { ...mineOne, 'GET /leagues/league-1/finance/summary': { body: summary } }
const team = { id: 'team-1', name: 'Tigres', slug: 'tigres', league_id: 'league-1', owner_id: 'o', is_active: true, created_at: '', updated_at: '' }
const balance = (over: Partial<TeamBalance> = {}): TeamBalance => ({
  team_id: 'team-1',
  team_name: 'Tigres',
  team_slug: 'tigres',
  league_id: 'league-1',
  league_name: 'Liga Norte',
  total_charges: '3000.00',
  total_paid: '1000.00',
  balance: '2000.00',
  pending_balance: '2000.00',
  overdue_count: 1,
  pending_fines_count: 0,
  ...over,
})

describe('Finance: transaction filters', () => {
  async function open() {
    const view = renderWithProviders(<FinancePageComponent />)
    await view.user.click(await screen.findByRole('tab', { name: 'Transacciones' }))
    return view
  }

  it('sends status and type as query params to the API', async () => {
    const fetchMock = mockApi({ ...base, 'GET /teams': list([team]), [txList]: list([transaction()]) })
    const { user } = await open()

    await screen.findByText('Inscripción Tigres')
    await user.click(screen.getByLabelText('Filtrar por estado'))
    await user.click(await screen.findByRole('option', { name: 'Vencido' }))
    await user.click(screen.getByLabelText('Filtrar por tipo'))
    await user.click(await screen.findByRole('option', { name: 'Multa Tarjeta Roja' }))

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([input]) => String(input))
      expect(urls.some((u) => u.includes('/finance/transactions') && u.includes('status=overdue') && u.includes('transaction_type=red_card_fine'))).toBe(true)
    })
  })

  it('sends the search as the q param (debounced) and goes back to the first page', async () => {
    const fetchMock = mockApi({
      ...base,
      'GET /teams': list([team]),
      [txList]: { body: { data: [transaction()], page: { limit: 25, offset: 0, total: 40 } } },
    })
    const { user } = await open()

    await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Página 2 de 2')
    await user.type(screen.getByLabelText('Buscar transacciones'), 'tigres')

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([input]) => String(input))
      expect(urls.some((u) => u.includes('/finance/transactions') && u.includes('q=TIGRES') && u.includes('offset=0'))).toBe(true)
    })
    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument()
  })

  it('shows the player name and number under the description', async () => {
    mockApi({ ...base, 'GET /teams': list([team]), [txList]: list([transaction({ player_name: 'Juan Pérez', player_number: 9 })]) })
    await open()

    expect(await screen.findByText(/Juan Pérez #9/i)).toBeInTheDocument()
  })
})

describe('Finance: team balance drill-down', () => {
  async function openBalances() {
    const view = renderWithProviders(<FinancePageComponent />)
    await view.user.click(await screen.findByRole('tab', { name: 'Equipos' }))
    return view
  }
  const routes = {
    ...base,
    'GET /teams': list([team]),
    [txList]: list([]),
    'GET /leagues/league-1/finance/balances': list([balance()]),
  }

  it('opens the statement of the team with its balance and transactions', async () => {
    const fetchMock = mockApi({
      ...routes,
      [teamBal]: { body: balance({ total_paid: '1200.00', pending_balance: '1800.00' }) },
      [teamTx]: list([transaction({ id: 'tx-9', description: 'Cuota abril' })]),
    })
    const { user } = await openBalances()

    await user.click(await screen.findByRole('button', { name: 'Ver estado de cuenta de Tigres' }))

    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Cuota abril')).toBeInTheDocument()
    expect(within(dialog).getByText(/1,800\.00/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, teamTx)).toHaveLength(1)
    expect(requestsTo(fetchMock, teamBal)).toHaveLength(1)
  })

  it('pays a charge from the statement: POST pay, then refreshes the statement', async () => {
    const fetchMock = mockApi({
      ...routes,
      [teamBal]: { body: balance() },
      [teamTx]: list([transaction({ id: 'tx-9', description: 'Cuota abril', amount: '500.00', amount_paid: '0.00', status: 'pending' })]),
      'POST /leagues/league-1/finance/transactions/tx-9/pay': { body: transaction({ status: 'paid' }) },
    })
    const { user } = await openBalances()

    await user.click(await screen.findByRole('button', { name: 'Ver estado de cuenta de Tigres' }))
    await user.click(await screen.findByRole('button', { name: 'Acciones de Cuota abril' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Registrar Pago' }))
    await user.click(screen.getByRole('button', { name: 'Registrar Pago' }))

    expect(await screen.findByText('Pago completo registrado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /leagues/league-1/finance/transactions/tx-9/pay')).toEqual([
      { amount: '500.00', payment_method: 'cash' },
    ])
    await waitFor(() => expect(requestsTo(fetchMock, teamTx).length).toBeGreaterThanOrEqual(2))
  })

  it('shows the API error of the team statement inside the dialog', async () => {
    mockApi({ ...routes, [teamBal]: { body: balance() }, [teamTx]: apiError(500, 'internal', 'Falla en estado de cuenta') })
    const { user } = await openBalances()

    await user.click(await screen.findByRole('button', { name: 'Ver estado de cuenta de Tigres' }))

    expect(await screen.findByText('Falla en estado de cuenta')).toBeInTheDocument()
  })
})
