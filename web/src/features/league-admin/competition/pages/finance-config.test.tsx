import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, financeConfig, league, list, summary } from '../test-fixtures'
import { FinancePageComponent } from './finance'

const cfgRoute = 'GET /leagues/league-1/finance/config'
const putRoute = 'PUT /leagues/league-1/finance/config'
const base = {
  'GET /leagues/mine': list([league()]),
  'GET /leagues/league-1/finance/summary': { body: summary },
  'GET /leagues/league-1/finance/transactions': list([]),
  'GET /leagues/league-1/finance/balances': list([]),
  'GET /teams': list([]),
}

async function openConfig(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Configurar' }))
  return screen.findByRole('dialog')
}

describe('Finance: module gate', () => {
  it('shows "Módulo no activado" when the league has no finance feature', async () => {
    mockApi({ 'GET /leagues/mine': list([league({ features: { finance: false } })]) })
    renderWithProviders(<FinancePageComponent />)

    expect(await screen.findByText('Módulo no activado')).toBeInTheDocument()
    expect(screen.getByText('Contacta al administrador del sistema para activar esta función.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nuevo Cargo' })).not.toBeInTheDocument()
  })

  it('shows the loading skeleton before the numbers arrive', async () => {
    mockApi({ ...base, [cfgRoute]: { body: financeConfig } })
    renderWithProviders(<FinancePageComponent />)

    expect(await screen.findByText('Cargando datos...')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Nuevo Cargo' })).toBeInTheDocument()
  })
})

describe('Finance: Configuración Financiera', () => {
  it('saves the amounts as decimal strings without the read-only name/currency, then confirms', async () => {
    // The API sends the amounts as JSON numbers: the form must still edit them.
    const config = { ...financeConfig, yellow_card_fine: 50, team_registration_fee: 0 }
    const fetchMock = mockApi({ ...base, [cfgRoute]: { body: config }, [putRoute]: { body: financeConfig } })
    const { user } = renderWithProviders(<FinancePageComponent />)

    const dialog = await openConfig(user)
    expect(within(dialog).getByText('Define las tarifas, multas y opciones de tu liga')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Inscripción Equipo (MXN)')).toHaveValue('0')
    await user.clear(within(dialog).getByLabelText('Inscripción Equipo (MXN)'))
    await user.type(within(dialog).getByLabelText('Inscripción Equipo (MXN)'), '1200.5')

    await user.click(within(dialog).getByRole('tab', { name: 'Multas' }))
    expect(within(dialog).getByLabelText('Amarilla')).toHaveValue('50')
    await user.clear(within(dialog).getByLabelText('Amarilla'))
    await user.type(within(dialog).getByLabelText('Amarilla'), '75')

    await user.click(within(dialog).getByRole('tab', { name: 'Opciones' }))
    await user.click(within(dialog).getByLabelText('Moneda'))
    await user.click(await screen.findByRole('option', { name: 'USD - Dólar' }))
    await user.click(within(dialog).getByLabelText('Generar multas automáticamente'))
    await user.clear(within(dialog).getByLabelText('Días para Pago'))
    await user.type(within(dialog).getByLabelText('Días para Pago'), '10')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('Configuración actualizada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, putRoute)).toEqual([
      {
        currency: 'USD',
        team_registration_fee: '1200.50',
        player_registration_fee: '0.00',
        late_registration_surcharge: '0.00',
        yellow_card_fine: '75.00',
        red_card_fine: '150.00',
        double_yellow_fine: '100.00',
        absence_fine: '500.00',
        late_arrival_fine: '100.00',
        misconduct_fine: '200.00',
        uniform_violation_fine: '100.00',
        referee_fee_per_match: '300.00',
        assistant_referee_fee: '150.00',
        field_rental_per_match: '0.00',
        auto_generate_fines: false,
        auto_generate_referee_fees: false,
        notify_on_new_charge: true,
        notify_on_overdue: true,
        payment_due_days: 10,
        overdue_grace_days: 3,
        payment_instructions: '',
        bank_account_info: '',
      },
    ])
    await screen.findByText('Gestión Financiera')
  })

  it('goes to the tab of an invalid field, keeps what was typed and sends nothing', async () => {
    const fetchMock = mockApi({ ...base, [cfgRoute]: { body: financeConfig } })
    const { user } = renderWithProviders(<FinancePageComponent />)

    const dialog = await openConfig(user)
    await user.click(within(dialog).getByRole('tab', { name: 'Multas' }))
    await user.clear(within(dialog).getByLabelText('Roja'))
    await user.type(within(dialog).getByLabelText('Roja'), '12.345')
    await user.click(within(dialog).getByRole('tab', { name: 'Opciones' }))
    await user.clear(within(dialog).getByLabelText('Días para Pago'))
    await user.type(within(dialog).getByLabelText('Días para Pago'), '95')
    await user.click(within(dialog).getByRole('tab', { name: 'Cuotas' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }))

    // the first invalid field (in form order) is on the Multas tab
    expect(await within(dialog).findByText('Máximo 2 decimales')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Roja')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByLabelText('Roja')).toHaveValue('12.345')
    await user.click(within(dialog).getByRole('tab', { name: 'Opciones' }))
    expect(within(dialog).getByText('Debe estar entre 0 y 90')).toBeInTheDocument()
    expect(requestsTo(fetchMock, putRoute)).toEqual([])
  })

  it('shows the API field error and keeps the dialog open', async () => {
    mockApi({
      ...base,
      [cfgRoute]: { body: financeConfig },
      [putRoute]: apiError(422, 'validation_failed', 'Datos inválidos', { payment_due_days: 'debe estar entre 0 y 90' }),
    })
    const { user } = renderWithProviders(<FinancePageComponent />)

    const dialog = await openConfig(user)
    await user.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }))

    expect(await within(dialog).findByText('debe estar entre 0 y 90')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Días para Pago')).toHaveAttribute('aria-invalid', 'true')
  })

  it('offers the original defaults (and "Crear Configuración") when the league has no config yet', async () => {
    mockApi({ ...base, [cfgRoute]: apiError(404, 'not_found', 'No encontrado') })
    const { user } = renderWithProviders(<FinancePageComponent />)

    const dialog = await openConfig(user)
    expect(within(dialog).getByRole('button', { name: 'Crear Configuración' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Arbitraje por Partido (MXN)')).toHaveValue('300')
    await user.click(within(dialog).getByRole('tab', { name: 'Multas' }))
    expect(within(dialog).getByLabelText('Roja')).toHaveValue('150')
    expect(within(dialog).getByLabelText('Incomparecencia')).toHaveValue('500')
  })

  it('does not save when cancelled', async () => {
    const fetchMock = mockApi({ ...base, [cfgRoute]: { body: financeConfig } })
    const { user } = renderWithProviders(<FinancePageComponent />)

    const dialog = await openConfig(user)
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, putRoute)).toEqual([])
  })
})
