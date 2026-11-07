import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders, mockApi } from '@/test/render'
import { FinancePageComponent } from './finance'

describe('FinancePage', () => {
  const mockLeague = {
    id: 'league-1',
    name: 'Mi Liga',
    slug: 'mi-liga',
    description: 'Liga de prueba',
    admin_id: 'admin-1',
    is_active: true,
    product_mode: 'full' as const,
  }

  const mockSummary = {
    league_id: 'league-1',
    league_name: 'Mi Liga',
    league_slug: 'mi-liga',
    total_income: '1000.00',
    total_charges: '800.00',
    total_collected: '700.00',
    total_pending: '100.00',
    total_overdue: '0.00',
    teams_with_transactions: 2,
    total_transactions: 5,
    overdue_transactions: 0,
  }

  const mockTransaction = {
    id: 'trans-1',
    league_id: 'league-1',
    team_id: 'team-1',
    transaction_type: 'registration_fee',
    description: 'Cuota de registro',
    amount: '500.00',
    amount_paid: '500.00',
    is_income: true,
    transaction_date: '2024-01-01',
    status: 'paid' as const,
    auto_generated: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  const mockTransactionResponse = {
    body: {
      data: [mockTransaction],
      page: { total: 1, limit: 25, offset: 0 },
    },
    status: 200,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no leagues', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [], page: { total: 0 } }, status: 200 },
    })
    renderWithProviders(<FinancePageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin liga asignada/i)).toBeInTheDocument()
    })
  })

  it('renders finance summary and transactions', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/finance/summary': { body: mockSummary, status: 200 },
      'GET /leagues/league-1/finance/transactions': mockTransactionResponse,
    })
    renderWithProviders(<FinancePageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/finanzas/i)).toBeInTheDocument()
    })
  })

  it('displays currency formatted amounts', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/finance/summary': { body: mockSummary, status: 200 },
      'GET /leagues/league-1/finance/transactions': mockTransactionResponse,
    })
    renderWithProviders(<FinancePageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/\$1,000\.00/)).toBeInTheDocument()
    })
  })

  it('shows empty state when no transactions', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/finance/summary': { body: mockSummary, status: 200 },
      'GET /leagues/league-1/finance/transactions': { body: { data: [], page: { total: 0, limit: 25, offset: 0 } }, status: 200 },
    })
    renderWithProviders(<FinancePageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/sin transacciones/i)).toBeInTheDocument()
    })
  })

  it('registers payment with success', async () => {
    const paidTransaction = { ...mockTransaction, amount_paid: '250.00', status: 'partial' as const }
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/finance/summary': { body: mockSummary, status: 200 },
      'GET /leagues/league-1/finance/transactions': mockTransactionResponse,
      'POST /leagues/{leagueId}/finance/transactions/trans-1/pay': {
        body: paidTransaction,
        status: 200,
      },
    })
    renderWithProviders(<FinancePageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Cuota de registro')).toBeInTheDocument()
    })
  })

  it('handles payment registration validation errors', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/finance/summary': { body: mockSummary, status: 200 },
      'GET /leagues/league-1/finance/transactions': mockTransactionResponse,
      'POST /leagues/{leagueId}/finance/transactions/trans-1/pay': {
        status: 422,
        body: {
          error: 'Validation failed',
          fields: { amount: 'El monto debe ser mayor a 0 y hasta 2 decimales' },
        },
      },
    })
    renderWithProviders(<FinancePageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Cuota de registro')).toBeInTheDocument()
    })
  })

  it('cancels transaction with confirmation', async () => {
    const cancelledTransaction = { ...mockTransaction, status: 'cancelled' as const }
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/finance/summary': { body: mockSummary, status: 200 },
      'GET /leagues/league-1/finance/transactions': mockTransactionResponse,
      'POST /leagues/{leagueId}/finance/transactions/trans-1/cancel': {
        body: cancelledTransaction,
        status: 200,
      },
    })
    renderWithProviders(<FinancePageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Cuota de registro')).toBeInTheDocument()
    })
  })

  it('waives transaction with confirmation', async () => {
    const waivedTransaction = { ...mockTransaction, status: 'waived' as const }
    mockApi({
      'GET /leagues/mine': { body: { data: [mockLeague], page: { total: 1 } }, status: 200 },
      'GET /leagues/league-1/finance/summary': { body: mockSummary, status: 200 },
      'GET /leagues/league-1/finance/transactions': mockTransactionResponse,
      'POST /leagues/{leagueId}/finance/transactions/trans-1/waive': {
        body: waivedTransaction,
        status: 200,
      },
    })
    renderWithProviders(<FinancePageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Cuota de registro')).toBeInTheDocument()
    })
  })

  it('handles API error', async () => {
    mockApi({
      'GET /leagues/mine': { status: 500, body: {} },
    })
    renderWithProviders(<FinancePageComponent />)
    await waitFor(() => {
      expect(screen.getByText(/ocurrió un error/i)).toBeInTheDocument()
    })
  })
})
