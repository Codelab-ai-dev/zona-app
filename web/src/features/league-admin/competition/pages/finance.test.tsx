import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, financeConfig, list, mineOne, summary, transaction } from '../test-fixtures'
import { FinancePageComponent } from './finance'

const txList = 'GET /leagues/league-1/finance/transactions'
const base = { ...mineOne, 'GET /leagues/league-1/finance/summary': { body: summary } }
const txBase = '/leagues/league-1/finance/transactions'
const team = { id: 'team-1', name: 'Tigres', slug: 'tigres', league_id: 'league-1', owner_id: 'o', is_active: true, created_at: '', updated_at: '' }

async function pickAction(user: ReturnType<typeof renderWithProviders>['user'], description: string, action: string) {
  await user.click(await screen.findByRole('button', { name: `Acciones de ${description}` }))
  await user.click(await screen.findByRole('menuitem', { name: action }))
}

async function renderOnTransactions() {
  const view = renderWithProviders(<FinancePageComponent />)
  await view.user.click(await screen.findByRole('tab', { name: 'Transacciones' }))
  return view
}

describe('Finance page: data', () => {
  it('shows the summary cards and the transactions with formatted money', async () => {
    mockApi({
      ...base,
      [txList]: list([transaction(), transaction({ id: 'tx-2', description: 'Multa roja', status: 'paid', transaction_type: 'red_card_fine' })]),
    })
    await renderOnTransactions()

    expect(await screen.findByText('Inscripción Tigres')).toBeInTheDocument()
    expect(screen.getAllByText(/1,500\.50/).length).toBeGreaterThan(0)
    expect(screen.getByText(/1,800\.50/)).toBeInTheDocument()
    expect(screen.getByText(/700\.25/)).toBeInTheDocument()
    expect(screen.getAllByText('2 transacciones').length).toBeGreaterThanOrEqual(2) // pending + overdue cards
    expect(screen.getByText('2 transacciones encontradas')).toBeInTheDocument()
    expect(screen.getByText('Multa Tarjeta Roja')).toBeInTheDocument()
    // sign: charges are shown as "-", incomes as "+"
    expect(within(screen.getByText('Inscripción Tigres').closest('tr') as HTMLElement).getByText(/^-\s*\$1,500\.50$/)).toBeInTheDocument()
  })

  it('offers only "Ver Detalles" on a paid transaction (no pay, waive or cancel)', async () => {
    mockApi({ ...base, [txList]: list([transaction({ id: 'tx-2', description: 'Multa roja', status: 'paid' })]) })
    const { user } = await renderOnTransactions()

    await user.click(await screen.findByRole('button', { name: 'Acciones de Multa roja' }))
    expect(await screen.findByRole('menuitem', { name: 'Ver Detalles' })).toBeInTheDocument()
    for (const hidden of ['Registrar Pago', 'Condonar', 'Cancelar']) {
      expect(screen.queryByRole('menuitem', { name: hidden })).not.toBeInTheDocument()
    }
  })

  it('shows the empty state', async () => {
    mockApi({ ...base, [txList]: list([]) })
    await renderOnTransactions()

    expect(await screen.findByText('Sin transacciones')).toBeInTheDocument()
  })

  it('shows the API error of the transactions list', async () => {
    mockApi({ ...base, [txList]: apiError(500, 'internal', 'Falla en transacciones') })
    await renderOnTransactions()

    expect(await screen.findByText('Falla en transacciones')).toBeInTheDocument()
  })

  it('pages through transactions with limit/offset', async () => {
    const fetchMock = mockApi({
      ...base,
      [txList]: { body: { data: [transaction()], page: { limit: 25, offset: 0, total: 40 } } },
    })
    const { user } = await renderOnTransactions()

    await screen.findByText('Página 1 de 2')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await screen.findByText('Página 2 de 2')
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls.some((u) => u.includes('/finance/transactions') && u.includes('offset=25') && u.includes('limit=25'))).toBe(true)
  })
})

describe('Finance page: pay', () => {
  const open = async (user: ReturnType<typeof renderWithProviders>['user']) => {
    await pickAction(user, 'Inscripción Tigres', 'Registrar Pago')
  }

  it('posts the payment to the league-scoped URL with the amount as a decimal string', async () => {
    const fetchMock = mockApi({
      ...base,
      [txList]: list([transaction()]),
      [`POST ${txBase}/tx-1/pay`]: { body: transaction({ status: 'paid' }) },
    })
    const { user } = await renderOnTransactions()

    await open(user)
    // defaults to what is still owed: 1500.50 - 500.00
    const amount = screen.getByLabelText('Monto a Pagar (MXN)')
    expect(amount).toHaveValue('1000.50')
    await user.clear(amount)
    await user.type(amount, '250.5')
    await user.click(screen.getByLabelText('Método de Pago'))
    await user.click(await screen.findByRole('option', { name: 'SPEI' }))
    await user.type(screen.getByLabelText('Referencia (opcional)'), 'abc123')
    await user.click(screen.getByRole('button', { name: 'Registrar Pago' }))

    expect(await screen.findByText('Pago completo registrado exitosamente')).toBeInTheDocument()
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
    const { user } = await renderOnTransactions()

    await open(user)
    const amount = screen.getByLabelText('Monto a Pagar (MXN)')
    await user.clear(amount)
    await user.type(amount, typed)
    await user.click(screen.getByRole('button', { name: 'Registrar Pago' }))

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
    const { user } = await renderOnTransactions()

    await open(user)
    await user.click(screen.getByRole('button', { name: 'Registrar Pago' }))

    expect(await screen.findByText('excede el saldo')).toBeInTheDocument()
    expect(screen.getByLabelText('Monto a Pagar (MXN)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('Finance page: cancel and waive', () => {
  it.each([
    ['Cancelar', 'cancel', 'Cancelar transacción', 'Transacción cancelada correctamente'],
    ['Condonar', 'waive', 'Condonar', 'Transacción condonada correctamente'],
  ])('%s asks for a reason and posts to /%s', async (trigger, path, confirm, toastText) => {
    const fetchMock = mockApi({
      ...base,
      [txList]: list([transaction()]),
      [`POST ${txBase}/tx-1/${path}`]: { body: transaction({ status: 'cancelled' }) },
    })
    const { user } = await renderOnTransactions()

    await pickAction(user, 'Inscripción Tigres', trigger)
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
    const { user } = await renderOnTransactions()

    await pickAction(user, 'Inscripción Tigres', 'Cancelar')
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar transacción' }))

    expect(await screen.findByText('El motivo es obligatorio')).toBeInTheDocument()
    expect(screen.getByLabelText('Motivo')).toHaveAttribute('aria-invalid', 'true')
    expect(requestsTo(fetchMock, `POST ${txBase}/tx-1/cancel`)).toEqual([])
  })

  it('does nothing when the confirmation is dismissed', async () => {
    const fetchMock = mockApi({ ...base, [txList]: list([transaction()]) })
    const { user } = await renderOnTransactions()

    await pickAction(user, 'Inscripción Tigres', 'Condonar')
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
    const { user } = await renderOnTransactions()

    await pickAction(user, 'Inscripción Tigres', 'Condonar')
    await user.type(screen.getByLabelText('Motivo'), 'x')
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Condonar' }))

    expect(await screen.findByText('La transacción ya fue pagada')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})

describe('Finance page: Nueva Transacción', () => {
  const create = `POST ${txBase}`
  const routes = { ...base, [txList]: list([]), 'GET /teams': list([team]) }
  const openForm = async (user: ReturnType<typeof renderWithProviders>['user']) => {
    await user.click((await screen.findAllByRole('button', { name: 'Nuevo Cargo' }))[0] as HTMLElement)
    await screen.findByRole('dialog')
  }

  it('creates a fine for a team with the amount as a decimal string and the due date', async () => {
    const fetchMock = mockApi({ ...routes, [create]: { status: 201, body: transaction() } })
    const { user } = await renderOnTransactions()

    await openForm(user)
    await user.click(screen.getByLabelText('Tipo de Transacción'))
    await user.click(await screen.findByRole('option', { name: 'Multa Tarjeta Roja' }))
    // the type prefills the description
    expect(screen.getByLabelText('Descripción')).toHaveValue('Multa por tarjeta roja')
    await user.click(screen.getByLabelText('Equipo'))
    await user.click(await screen.findByRole('option', { name: 'Tigres' }))
    await user.type(screen.getByLabelText('Monto (MXN)'), '350')
    await user.clear(screen.getByLabelText('Descripción'))
    await user.type(screen.getByLabelText('Descripción'), 'Roja jornada 4')
    fireEvent.change(screen.getByLabelText('Fecha de Vencimiento'), { target: { value: '2026-12-01' } })
    await user.type(screen.getByLabelText('Notas (opcional)'), 'Partido vs Leones')
    await user.click(screen.getByRole('button', { name: 'Crear Transacción' }))

    expect(await screen.findByText('Transacción creada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, create)).toEqual([
      {
        transaction_type: 'red_card_fine',
        description: 'ROJA JORNADA 4',
        amount: '350.00',
        is_income: false,
        team_id: 'team-1',
        due_date: '2026-12-01',
        notes: 'PARTIDO VS LEONES',
      },
    ])
    expect(requestsTo(fetchMock, txList).length).toBeGreaterThanOrEqual(2)
  })

  it('creates an income without a team, flags is_income and has no due date', async () => {
    const fetchMock = mockApi({ ...routes, [create]: { status: 201, body: transaction({ is_income: true }) } })
    const { user } = await renderOnTransactions()

    await openForm(user)
    await user.click(screen.getByLabelText('Tipo de Transacción'))
    await user.click(await screen.findByRole('option', { name: 'Patrocinio' }))
    expect(screen.queryByLabelText('Fecha de Vencimiento')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Monto (MXN)'), '5000.99')
    await user.type(screen.getByLabelText('Descripción'), 'Patrocinador local')
    await user.click(screen.getByRole('button', { name: 'Crear Transacción' }))

    expect(await screen.findByText('Transacción creada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, create)).toEqual([
      { transaction_type: 'sponsorship', description: 'PATROCINADOR LOCAL', amount: '5000.99', is_income: true },
    ])
  })

  it('prefills description and amount from the league config when picking a type', async () => {
    mockApi({ ...routes, 'GET /leagues/league-1/finance/config': { body: { ...financeConfig, yellow_card_fine: 75 } } })
    const { user } = await renderOnTransactions()

    await openForm(user)
    await user.click(screen.getByLabelText('Tipo de Transacción'))
    await user.click(await screen.findByRole('option', { name: 'Multa Tarjeta Amarilla' }))

    expect(screen.getByLabelText('Monto (MXN)')).toHaveValue('75')
    expect(screen.getByLabelText('Descripción')).toHaveValue('Multa por tarjeta amarilla')
  })

  it('validates type, team (for charges), amount and description client-side', async () => {
    const fetchMock = mockApi({ ...routes })
    const { user } = await renderOnTransactions()

    await openForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear Transacción' }))
    expect(screen.getByLabelText('Tipo de Transacción')).toHaveAccessibleDescription('Selecciona un tipo')
    expect(screen.getByLabelText('Monto (MXN)')).toHaveAccessibleDescription('Ingresa un monto')
    expect(screen.getByLabelText('Descripción')).toHaveAccessibleDescription('La descripción debe tener al menos 3 caracteres')

    await user.click(screen.getByLabelText('Tipo de Transacción'))
    await user.click(await screen.findByRole('option', { name: 'Multa por Llegada Tarde' }))
    await user.clear(screen.getByLabelText('Descripción'))
    await user.type(screen.getByLabelText('Monto (MXN)'), '10.999')
    await user.type(screen.getByLabelText('Descripción'), 'x')
    await user.click(screen.getByRole('button', { name: 'Crear Transacción' }))

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
    const { user } = await renderOnTransactions()

    await openForm(user)
    await user.click(screen.getByLabelText('Tipo de Transacción'))
    await user.click(await screen.findByRole('option', { name: 'Otro Ingreso' }))
    await user.type(screen.getByLabelText('Monto (MXN)'), '20')
    await user.type(screen.getByLabelText('Descripción'), 'Rifa')
    await user.click(screen.getByRole('button', { name: 'Crear Transacción' }))

    expect(await screen.findByText('ya existe un cargo igual')).toBeInTheDocument()
    expect(screen.getByLabelText('Descripción')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Descripción')).toHaveValue('RIFA')
  })
})
