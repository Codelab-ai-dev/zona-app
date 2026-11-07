import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, list, mineOne, summary, transaction } from '../test-fixtures'
import { FinancePageComponent } from './finance'

const txList = 'GET /leagues/league-1/finance/transactions'
const base = { ...mineOne, 'GET /leagues/league-1/finance/summary': { body: summary } }
const txBase = '/leagues/league-1/finance/transactions'
const team = { id: 'team-1', name: 'Tigres', slug: 'tigres', league_id: 'league-1', owner_id: 'o', is_active: true, created_at: '', updated_at: '' }

describe('Finance page: data', () => {
  it('shows the summary cards and the transactions with formatted money', async () => {
    mockApi({
      ...base,
      [txList]: list([transaction(), transaction({ id: 'tx-2', description: 'Multa roja', status: 'paid', transaction_type: 'red_card_fine' })]),
    })
    renderWithProviders(<FinancePageComponent />)

    expect(await screen.findByText('Inscripción Tigres')).toBeInTheDocument()
    expect(screen.getAllByText(/1,500\.50/).length).toBeGreaterThan(0)
    expect(screen.getByText(/2,500\.00/)).toBeInTheDocument()
    expect(screen.getByText('2 vencidos')).toBeInTheDocument()
    expect(screen.getByText('Multa por tarjeta roja')).toBeInTheDocument()
    // paid transactions have no pay/cancel/waive actions
    const paidRow = screen.getByText('Multa roja').closest('tr') as HTMLElement
    expect(within(paidRow).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    mockApi({ ...base, [txList]: list([]) })
    renderWithProviders(<FinancePageComponent />)

    expect(await screen.findByText('Sin transacciones')).toBeInTheDocument()
  })

  it('shows the API error of the transactions list', async () => {
    mockApi({ ...base, [txList]: apiError(500, 'internal', 'Falla en transacciones') })
    renderWithProviders(<FinancePageComponent />)

    expect(await screen.findByText('Falla en transacciones')).toBeInTheDocument()
  })

  it('pages through transactions with limit/offset', async () => {
    const fetchMock = mockApi({
      ...base,
      [txList]: { body: { data: [transaction()], page: { limit: 25, offset: 0, total: 40 } } },
    })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await screen.findByText('Página 1 de 2')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await screen.findByText('Página 2 de 2')
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls.some((u) => u.includes('/finance/transactions') && u.includes('offset=25') && u.includes('limit=25'))).toBe(true)
  })
})

describe('Finance page: pay', () => {
  const open = async (user: ReturnType<typeof renderWithProviders>['user']) => {
    await user.click(await screen.findByRole('button', { name: 'Registrar pago de Inscripción Tigres' }))
  }

  it('posts the payment to the league-scoped URL with the amount as a decimal string', async () => {
    const fetchMock = mockApi({
      ...base,
      [txList]: list([transaction()]),
      [`POST ${txBase}/tx-1/pay`]: { body: transaction({ status: 'paid' }) },
    })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await open(user)
    // defaults to what is still owed: 1500.50 - 500.00
    const amount = screen.getByLabelText('Monto (MXN)')
    expect(amount).toHaveValue('1000.50')
    await user.clear(amount)
    await user.type(amount, '250.5')
    await user.click(screen.getByLabelText('Método de pago'))
    await user.click(await screen.findByRole('option', { name: 'SPEI' }))
    await user.type(screen.getByLabelText('Referencia (opcional)'), 'abc123')
    await user.click(screen.getByRole('button', { name: 'Registrar pago' }))

    expect(await screen.findByText('Pago registrado correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, `POST ${txBase}/tx-1/pay`)).toEqual([
      { amount: '250.50', payment_method: 'spei', payment_reference: 'ABC123' },
    ])
    // list and summary are refreshed
    expect(requestsTo(fetchMock, txList).length).toBeGreaterThanOrEqual(2)
    expect(requestsTo(fetchMock, 'GET /leagues/league-1/finance/summary').length).toBeGreaterThanOrEqual(2)
  })

  it.each([
    ['0', 'Debe ser mayor a 0'],
    ['-5', 'Ingresa un monto válido'],
    ['10.123', 'Máximo 2 decimales'],
    ['abc', 'Ingresa un monto válido'],
    ['1000000', 'No puede exceder 999999.99'],
  ])('rejects the amount %j without calling the API', async (typed, message) => {
    const fetchMock = mockApi({ ...base, [txList]: list([transaction()]) })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await open(user)
    const amount = screen.getByLabelText('Monto (MXN)')
    await user.clear(amount)
    await user.type(amount, typed)
    await user.click(screen.getByRole('button', { name: 'Registrar pago' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(amount).toHaveValue(typed.toUpperCase()) // inputs uppercase typed text
    expect(requestsTo(fetchMock, `POST ${txBase}/tx-1/pay`)).toEqual([])
  })

  it('shows the field error returned by the API and keeps the dialog open', async () => {
    mockApi({
      ...base,
      [txList]: list([transaction()]),
      [`POST ${txBase}/tx-1/pay`]: apiError(422, 'validation_failed', 'Datos inválidos', { amount: 'excede el saldo' }),
    })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await open(user)
    await user.click(screen.getByRole('button', { name: 'Registrar pago' }))

    expect(await screen.findByText('excede el saldo')).toBeInTheDocument()
    expect(screen.getByLabelText('Monto (MXN)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('Finance page: cancel and waive', () => {
  it.each([
    ['Cancelar Inscripción Tigres', 'cancel', 'Cancelar transacción', 'Transacción cancelada correctamente'],
    ['Condonar Inscripción Tigres', 'waive', 'Condonar', 'Transacción condonada correctamente'],
  ])('%s asks for a reason and posts to /%s', async (trigger, path, confirm, toastText) => {
    const fetchMock = mockApi({
      ...base,
      [txList]: list([transaction()]),
      [`POST ${txBase}/tx-1/${path}`]: { body: transaction({ status: 'cancelled' }) },
    })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await user.click(await screen.findByRole('button', { name: trigger }))
    const dialog = screen.getByRole('alertdialog')
    expect(requestsTo(fetchMock, `POST ${txBase}/tx-1/${path}`)).toEqual([])
    await user.type(within(dialog).getByLabelText('Motivo'), 'acuerdo con el comité')
    await user.click(within(dialog).getByRole('button', { name: confirm }))

    expect(await screen.findByText(toastText)).toBeInTheDocument()
    expect(requestsTo(fetchMock, `POST ${txBase}/tx-1/${path}`)).toEqual([{ reason: 'ACUERDO CON EL COMITÉ' }])
    expect(requestsTo(fetchMock, txList).length).toBeGreaterThanOrEqual(2)
  })

  it('requires a reason before cancelling', async () => {
    const fetchMock = mockApi({ ...base, [txList]: list([transaction()]) })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Cancelar Inscripción Tigres' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar transacción' }))

    expect(await screen.findByText('El motivo es obligatorio')).toBeInTheDocument()
    expect(screen.getByLabelText('Motivo')).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, `POST ${txBase}/tx-1/cancel`)).toEqual([])
  })

  it('does nothing when the confirmation is dismissed', async () => {
    const fetchMock = mockApi({ ...base, [txList]: list([transaction()]) })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Condonar Inscripción Tigres' }))
    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, `POST ${txBase}/tx-1/waive`)).toEqual([])
  })

  it('shows the API error toast and keeps the dialog open when waiving fails', async () => {
    mockApi({
      ...base,
      [txList]: list([transaction()]),
      [`POST ${txBase}/tx-1/waive`]: apiError(409, 'conflict', 'La transacción ya fue pagada'),
    })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Condonar Inscripción Tigres' }))
    await user.type(screen.getByLabelText('Motivo'), 'x')
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Condonar' }))

    expect(await screen.findByText('La transacción ya fue pagada')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})

describe('Finance page: Nuevo movimiento', () => {
  const create = `POST ${txBase}`
  const routes = { ...base, [txList]: list([]), 'GET /teams': list([team]) }

  it('creates a fine for a team with the amount as a decimal string', async () => {
    const fetchMock = mockApi({ ...routes, [create]: { status: 201, body: transaction() } })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Nuevo movimiento' }))
    await user.click(screen.getByLabelText('Tipo'))
    await user.click(await screen.findByRole('option', { name: /multa por tarjeta roja/i }))
    await user.click(screen.getByLabelText('Equipo'))
    await user.click(await screen.findByRole('option', { name: 'Tigres' }))
    await user.type(screen.getByLabelText('Monto (MXN)'), '350')
    await user.type(screen.getByLabelText('Descripción'), 'Roja jornada 4')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Movimiento creado correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, create)).toEqual([
      {
        transaction_type: 'red_card_fine',
        description: 'ROJA JORNADA 4',
        amount: '350.00',
        is_income: false,
        team_id: 'team-1',
      },
    ])
    expect(requestsTo(fetchMock, txList).length).toBeGreaterThanOrEqual(2)
  })

  it('creates an income without a team and flags is_income', async () => {
    const fetchMock = mockApi({ ...routes, [create]: { status: 201, body: transaction({ is_income: true }) } })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Nuevo movimiento' }))
    await user.click(screen.getByLabelText('Tipo'))
    await user.click(await screen.findByRole('option', { name: /patrocinio/i }))
    await user.type(screen.getByLabelText('Monto (MXN)'), '5000.99')
    await user.type(screen.getByLabelText('Descripción'), 'Patrocinador local')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Movimiento creado correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, create)).toEqual([
      { transaction_type: 'sponsorship', description: 'PATROCINADOR LOCAL', amount: '5000.99', is_income: true },
    ])
  })

  it('validates type, team (for charges), amount and description client-side', async () => {
    const fetchMock = mockApi({ ...routes })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Nuevo movimiento' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByLabelText('Tipo')).toHaveAccessibleDescription('Selecciona un tipo')
    expect(screen.getByLabelText('Monto (MXN)')).toHaveAccessibleDescription('Ingresa un monto')
    expect(screen.getByLabelText('Descripción')).toHaveAccessibleDescription('La descripción es obligatoria')

    await user.click(screen.getByLabelText('Tipo'))
    await user.click(await screen.findByRole('option', { name: /inasistencia/i }))
    await user.type(screen.getByLabelText('Monto (MXN)'), '10.999')
    await user.type(screen.getByLabelText('Descripción'), 'x')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByLabelText('Equipo')).toHaveAccessibleDescription('Selecciona un equipo')
    expect(screen.getByLabelText('Monto (MXN)')).toHaveAccessibleDescription('Máximo 2 decimales')
    expect(screen.getByLabelText('Monto (MXN)')).toHaveValue('10.999')
    expect(requestsTo(fetchMock, create)).toEqual([])
  })

  it('shows the API field error and keeps the typed values', async () => {
    mockApi({
      ...routes,
      [create]: apiError(422, 'validation_failed', 'Datos inválidos', { description: 'ya existe un cargo igual' }),
    })
    const { user } = renderWithProviders(<FinancePageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Nuevo movimiento' }))
    await user.click(screen.getByLabelText('Tipo'))
    await user.click(await screen.findByRole('option', { name: /otro ingreso/i }))
    await user.type(screen.getByLabelText('Monto (MXN)'), '20')
    await user.type(screen.getByLabelText('Descripción'), 'Rifa')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('ya existe un cargo igual')).toBeInTheDocument()
    expect(screen.getByLabelText('Descripción')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Descripción')).toHaveValue('RIFA')
  })
})
