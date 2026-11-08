import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { leaguesMine, page, team } from './test-fixtures'
import { VerificationPage } from './verification-page'

const PLAYER = 'a0000000-0000-4000-8000-000000000001'
const KEY = `player_document/${PLAYER}/b0000000-0000-4000-8000-000000000002.pdf`
const IMG = `player_document/${PLAYER}/c0000000-0000-4000-8000-000000000003.png`

const row = (extra: object = {}) => ({
  player_id: PLAYER,
  name: 'Juan Pérez',
  jersey_number: 1,
  position: 'Portero',
  birth_date: '2000-06-15',
  team_id: 'team-1',
  team_name: 'Los Campeones',
  status: 'no_document',
  ...extra,
})
const tournament = { id: 'tour-1', name: 'Apertura', league_id: 'league-1', age_validation_enabled: true, min_age: 18, max_age: 30, age_reference_date: '2025-01-01' }
const summary = { body: { total: 10, pending: 3, verified: 5, no_document: 2 } }

const base = (rows: object[] = [row()]) => ({
  'GET /leagues/mine': leaguesMine,
  'GET /teams': page([team('team-1', 'Los Campeones', { tournament_id: 'tour-1' }), team('team-2', 'Tigres')]),
  'GET /leagues/league-1/tournaments': page([tournament]),
  'GET /leagues/league-1/players/verification': page(rows),
  'GET /leagues/league-1/players/verification/summary': summary,
})
const verificationPath = `/players/${PLAYER}/verification`
const status = (extra: object) => ({ body: { player_id: PLAYER, id_verified: false, ...extra } })

describe('VerificationPage', () => {
  it('shows the empty state when the admin has no leagues', async () => {
    mockApi({ 'GET /leagues/mine': page([]) })
    renderWithProviders(<VerificationPage />)
    expect(await screen.findByText('No hay ligas')).toBeInTheDocument()
  })

  it('shows the counters and the player with the age badge from the tournament rules', async () => {
    mockApi(base([row({ status: 'pending', document_key: KEY }), row({ player_id: 'p2', name: 'Pedro Niño', birth_date: '2012-01-01' })]))
    renderWithProviders(<VerificationPage />)

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Total').previousElementSibling).toHaveTextContent('10')
    expect(screen.getByText('Pendientes').previousElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Verificados').previousElementSibling).toHaveTextContent('5')
    expect(screen.getAllByText('Sin INE')[0]?.previousElementSibling).toHaveTextContent('2')
    expect(screen.getByText('24 años')).toBeInTheDocument()
    expect(screen.getByText('Cumple edad')).toBeInTheDocument()
    expect(screen.getByText('No cumple edad')).toBeInTheDocument()
  })

  it('shows the API error with retry when the list fails', async () => {
    mockApi({ ...base(), 'GET /leagues/league-1/players/verification': { status: 500, body: { error: { code: 'internal', message: 'Falla del servidor' } } } })
    renderWithProviders(<VerificationPage />)
    expect(await screen.findByText(/falla del servidor/i)).toBeInTheDocument()
  })

  it('sends the status, team, search and offset filters to the API', async () => {
    const fetchMock = mockApi(base())
    const { user } = renderWithProviders(<VerificationPage />)
    await screen.findByText('Juan Pérez')

    await user.click(screen.getByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Pendientes de verificar' }))
    await user.click(screen.getByRole('combobox', { name: 'Equipo' }))
    await user.click(await screen.findByRole('option', { name: 'Tigres' }))
    await user.type(screen.getByLabelText('Buscar jugador'), 'juan')

    await vi.waitFor(() => {
      const urls = fetchMock.mock.calls.map(([u]) => decodeURIComponent(String(u)))
      expect(urls.some((u) => u.includes('status=pending') && u.includes('team_id=team-2') && u.includes('q=JUAN') && u.includes('limit=20'))).toBe(true)
    })
  })

  it('pages through the list with limit/offset', async () => {
    const fetchMock = mockApi({
      ...base(),
      'GET /leagues/league-1/players/verification': { body: { data: [row()], page: { limit: 20, offset: 0, total: 45 } } },
    })
    const { user } = renderWithProviders(<VerificationPage />)
    await screen.findByText('Juan Pérez')
    expect(screen.getByText('1–1 de 45')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => String(u).includes('offset=20'))).toBe(true),
    )
  })

  it('uploads the document as multipart with scope=player_document and attaches it', async () => {
    const fetchMock = mockApi({
      ...base(),
      'POST /storage/objects': { status: 201, body: { key: KEY, is_public: false } },
      [`PATCH ${verificationPath}`]: status({ document_key: KEY }),
    })
    const { user } = renderWithProviders(<VerificationPage />)

    const file = new File(['%PDF-1.4'], 'ine.pdf', { type: 'application/pdf' })
    await user.upload(await screen.findByLabelText('Subir documento de Juan Pérez'), file)

    expect(await screen.findByText('Documento de Juan Pérez subido')).toBeInTheDocument()
    const [call] = fetchMock.mock.calls.filter(([input, init]) => String(input).endsWith('/storage/objects') && init?.method === 'POST')
    const form = call?.[1]?.body as FormData
    expect(form.get('scope')).toBe('player_document')
    expect(form.get('scope_id')).toBe(PLAYER)
    expect((form.get('file') as File).name).toBe('ine.pdf')
    expect(requestsTo(fetchMock, `PATCH ${verificationPath}`)).toEqual([{ verified: false, document_key: KEY }])
  })

  it('rejects an unsupported file type without calling the API', async () => {
    const fetchMock = mockApi(base())
    renderWithProviders(<VerificationPage />)

    const input = await screen.findByLabelText('Subir documento de Juan Pérez')
    fireEvent.change(input, { target: { files: [new File(['x'], 'nota.txt', { type: 'text/plain' })] } })

    expect(await screen.findByText('Formato no permitido. Usa JPEG, PNG, WEBP o PDF.')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /storage/objects')).toEqual([])
  })

  it('shows the upload error returned by the API', async () => {
    mockApi({
      ...base(),
      'POST /storage/objects': { status: 422, body: { error: { code: 'validation_error', message: 'El archivo supera 10 MB' } } },
    })
    const { user } = renderWithProviders(<VerificationPage />)

    await user.upload(await screen.findByLabelText('Subir documento de Juan Pérez'), new File(['x'], 'ine.png', { type: 'image/png' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo supera 10 MB')
  })

  it('marks a pending player as verified after confirmation, sending the document key', async () => {
    const fetchMock = mockApi({
      ...base([row({ status: 'pending', document_key: KEY })]),
      [`PATCH ${verificationPath}`]: status({ id_verified: true, document_key: KEY }),
    })
    const { user } = renderWithProviders(<VerificationPage />)

    await user.click(await screen.findByRole('button', { name: 'Marcar verificado a Juan Pérez' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Juan Pérez verificado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, `PATCH ${verificationPath}`)).toEqual([{ verified: true, document_key: KEY }])
  })

  it('shows the 422 message when the API refuses the verification', async () => {
    mockApi({
      ...base([row({ status: 'pending', document_key: KEY })]),
      [`PATCH ${verificationPath}`]: { status: 422, body: { error: { code: 'validation_error', message: 'El documento no pertenece a este jugador' } } },
    })
    const { user } = renderWithProviders(<VerificationPage />)

    await user.click(await screen.findByRole('button', { name: 'Marcar verificado a Juan Pérez' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El documento no pertenece a este jugador')
  })

  it('removes the verification only after confirming, sending verified:false', async () => {
    const fetchMock = mockApi({
      ...base([row({ status: 'verified', document_key: KEY })]),
      [`PATCH ${verificationPath}`]: status({ document_key: KEY }),
    })
    const { user } = renderWithProviders(<VerificationPage />)

    await user.click(await screen.findByRole('button', { name: 'Quitar verificación a Juan Pérez' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(requestsTo(fetchMock, `PATCH ${verificationPath}`)).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Quitar verificación a Juan Pérez' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Verificación de Juan Pérez retirada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, `PATCH ${verificationPath}`)).toEqual([{ verified: false }])
  })

  it('shows an image document inline using the presigned URL', async () => {
    const fetchMock = mockApi({
      ...base([row({ status: 'pending', document_key: IMG })]),
      'GET /storage/url': { body: { url: 'https://storage.example/signed.png?sig=1' } },
    })
    const { user } = renderWithProviders(<VerificationPage />)

    await user.click(await screen.findByRole('button', { name: 'Ver documento de Juan Pérez' }))

    const img = await screen.findByAltText('Documento de identidad de Juan Pérez')
    expect(img).toHaveAttribute('src', 'https://storage.example/signed.png?sig=1')
    const urlCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/storage/url'))
    expect(decodeURIComponent(String(urlCall?.[0]))).toContain(`key=${IMG}`)
  })

  it('shows a PDF document in an iframe and approves it from the dialog', async () => {
    const fetchMock = mockApi({
      ...base([row({ status: 'pending', document_key: KEY })]),
      'GET /storage/url': { body: { url: 'https://storage.example/signed.pdf?sig=1' } },
      [`PATCH ${verificationPath}`]: status({ id_verified: true, document_key: KEY }),
    })
    const { user } = renderWithProviders(<VerificationPage />)

    await user.click(await screen.findByRole('button', { name: 'Ver documento de Juan Pérez' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByTitle('Documento de Juan Pérez')).toHaveAttribute('src', 'https://storage.example/signed.pdf?sig=1')

    await user.click(within(dialog).getByRole('button', { name: 'Aprobar Verificación' }))
    expect(await screen.findByText('Juan Pérez verificado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, `PATCH ${verificationPath}`)).toEqual([{ verified: true, document_key: KEY }])
  })

  it('edits the birth date and verifies in the same step when a document exists', async () => {
    const fetchMock = mockApi({
      ...base([row({ status: 'pending', document_key: KEY })]),
      [`PATCH /players/${PLAYER}`]: { body: {} },
      [`PATCH ${verificationPath}`]: status({ id_verified: true, document_key: KEY }),
    })
    const { user } = renderWithProviders(<VerificationPage />)

    await user.click(await screen.findByRole('button', { name: 'Editar fecha de nacimiento de Juan Pérez' }))
    fireEvent.change(await screen.findByLabelText('Fecha de Nacimiento'), { target: { value: '1999-03-04' } })
    await user.click(screen.getByRole('button', { name: 'Guardar y Verificar' }))

    expect(await screen.findByText('Fecha de nacimiento actualizada y verificada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, `PATCH /players/${PLAYER}`)).toEqual([{ birth_date: '1999-03-04' }])
    expect(requestsTo(fetchMock, `PATCH ${verificationPath}`)).toEqual([{ verified: true, document_key: KEY }])
  })

  it('only saves the birth date when the verify option is unchecked', async () => {
    const fetchMock = mockApi({
      ...base([row({ status: 'pending', document_key: KEY })]),
      [`PATCH /players/${PLAYER}`]: { body: {} },
    })
    const { user } = renderWithProviders(<VerificationPage />)

    await user.click(await screen.findByRole('button', { name: 'Editar fecha de nacimiento de Juan Pérez' }))
    fireEvent.change(await screen.findByLabelText('Fecha de Nacimiento'), { target: { value: '1999-03-04' } })
    await user.click(screen.getByRole('checkbox', { name: /marcar como verificado/i }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Fecha de nacimiento actualizada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, `PATCH ${verificationPath}`)).toEqual([])
  })

  it('keeps the dialog open with the API error when the birth date is refused', async () => {
    mockApi({
      ...base(),
      [`PATCH /players/${PLAYER}`]: { status: 422, body: { error: { code: 'validation_error', message: 'Datos inválidos', fields: { birth_date: 'Fecha inválida' } } } },
    })
    const { user } = renderWithProviders(<VerificationPage />)

    await user.click(await screen.findByRole('button', { name: 'Editar fecha de nacimiento de Juan Pérez' }))
    fireEvent.change(await screen.findByLabelText('Fecha de Nacimiento'), { target: { value: '1999-03-04' } })
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Fecha inválida')).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha de Nacimiento')).toHaveValue('1999-03-04')
  })
})
