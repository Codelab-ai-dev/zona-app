import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { leaguesMine, page, team } from './test-fixtures'
import { VerificationPage } from './verification-page'

type User = ReturnType<typeof renderWithProviders>['user']

const PLAYER = 'a0000000-0000-4000-8000-000000000001'
const KEY = `player_document/${PLAYER}/b0000000-0000-4000-8000-000000000002.pdf`
const player = { id: PLAYER, name: 'Juan Pérez', team_id: 'team-1', position: 'Portero', jersey_number: 1, is_active: true, id_verified: false }

const base = {
  'GET /leagues/mine': leaguesMine,
  'GET /teams': page([team('team-1', 'Los Campeones')]),
  'GET /teams/team-1/players': page([player]),
}
const verificationPath = `/players/${PLAYER}/verification`
const status = (extra: object) => ({ body: { player_id: PLAYER, id_verified: false, ...extra } })

async function openTeam(user: User) {
  await user.click(await screen.findByRole('combobox', { name: 'Equipo' }))
  await user.click(await screen.findByRole('option', { name: 'Los Campeones' }))
  await screen.findByText('Juan Pérez')
}

describe('VerificationPage', () => {
  it('shows the empty state when the admin has no leagues', async () => {
    mockApi({ 'GET /leagues/mine': page([]) })
    renderWithProviders(<VerificationPage />)
    expect(await screen.findByText('No hay ligas')).toBeInTheDocument()
  })

  it('shows "Sin documento" and an upload control when no document exists', async () => {
    mockApi({ ...base, [`GET ${verificationPath}`]: status({}) })
    const { user } = renderWithProviders(<VerificationPage />)
    await openTeam(user)

    expect(await screen.findByText('Sin documento')).toBeInTheDocument()
    expect(screen.getByLabelText('Subir documento de Juan Pérez')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /marcar verificado/i })).not.toBeInTheDocument()
  })

  it('uploads the document as multipart with scope=player_document and attaches it', async () => {
    const fetchMock = mockApi({
      ...base,
      [`GET ${verificationPath}`]: status({}),
      'POST /storage/objects': { status: 201, body: { key: KEY, is_public: false } },
      [`PATCH ${verificationPath}`]: status({ document_key: KEY }),
    })
    const { user } = renderWithProviders(<VerificationPage />)
    await openTeam(user)

    const file = new File(['%PDF-1.4'], 'ine.pdf', { type: 'application/pdf' })
    await user.upload(await screen.findByLabelText('Subir documento de Juan Pérez'), file)

    expect(await screen.findByText('Documento de Juan Pérez subido')).toBeInTheDocument()
    const [call] = fetchMock.mock.calls.filter(([input, init]) => String(input).endsWith('/storage/objects') && init?.method === 'POST')
    const form = call?.[1]?.body
    expect(form).toBeInstanceOf(FormData)
    expect((form as FormData).get('scope')).toBe('player_document')
    expect((form as FormData).get('scope_id')).toBe(PLAYER)
    expect(((form as FormData).get('file') as File).name).toBe('ine.pdf')
    expect(requestsTo(fetchMock, `PATCH ${verificationPath}`)).toEqual([{ verified: false, document_key: KEY }])
  })

  it('rejects an unsupported file type without calling the API', async () => {
    const fetchMock = mockApi({ ...base, [`GET ${verificationPath}`]: status({}) })
    const { user } = renderWithProviders(<VerificationPage />)
    await openTeam(user)

    const input = await screen.findByLabelText('Subir documento de Juan Pérez')
    // user.upload skips files outside `accept`; dispatch the change like a browser that does not filter.
    fireEvent.change(input, { target: { files: [new File(['x'], 'nota.txt', { type: 'text/plain' })] } })

    expect(await screen.findByText('Formato no permitido. Usa JPEG, PNG, WEBP o PDF.')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /storage/objects')).toEqual([])
  })

  it('shows the upload error returned by the API', async () => {
    mockApi({
      ...base,
      [`GET ${verificationPath}`]: status({}),
      'POST /storage/objects': { status: 422, body: { error: { code: 'validation_error', message: 'El archivo supera 10 MB' } } },
    })
    const { user } = renderWithProviders(<VerificationPage />)
    await openTeam(user)

    await user.upload(await screen.findByLabelText('Subir documento de Juan Pérez'), new File(['x'], 'ine.png', { type: 'image/png' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo supera 10 MB')
  })

  it('marks a player as verified after confirmation, sending the document key', async () => {
    const fetchMock = mockApi({
      ...base,
      [`GET ${verificationPath}`]: status({ document_key: KEY }),
      [`PATCH ${verificationPath}`]: status({ id_verified: true, document_key: KEY }),
    })
    const { user } = renderWithProviders(<VerificationPage />)
    await openTeam(user)

    expect(await screen.findByText('Pendiente de revisión')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Marcar verificado a Juan Pérez' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Juan Pérez verificado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, `PATCH ${verificationPath}`)).toEqual([{ verified: true, document_key: KEY }])
  })

  it('shows the 422 message when the API refuses the verification', async () => {
    mockApi({
      ...base,
      [`GET ${verificationPath}`]: status({ document_key: KEY }),
      [`PATCH ${verificationPath}`]: {
        status: 422,
        body: { error: { code: 'validation_error', message: 'El documento no pertenece a este jugador' } },
      },
    })
    const { user } = renderWithProviders(<VerificationPage />)
    await openTeam(user)

    await user.click(await screen.findByRole('button', { name: 'Marcar verificado a Juan Pérez' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El documento no pertenece a este jugador')
    expect(screen.getByText('Pendiente de revisión')).toBeInTheDocument()
  })

  it('removes the verification only after confirming, sending verified:false', async () => {
    const fetchMock = mockApi({
      ...base,
      [`GET ${verificationPath}`]: status({ id_verified: true, document_key: KEY }),
      [`PATCH ${verificationPath}`]: status({ document_key: KEY }),
    })
    const { user } = renderWithProviders(<VerificationPage />)
    await openTeam(user)

    expect(await screen.findByText('Verificado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Quitar verificación a Juan Pérez' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(requestsTo(fetchMock, `PATCH ${verificationPath}`)).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Quitar verificación a Juan Pérez' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Verificación de Juan Pérez retirada')).toBeInTheDocument()
    expect(requestsTo(fetchMock, `PATCH ${verificationPath}`)).toEqual([{ verified: false }])
  })

  it('opens the presigned URL in a new tab with noopener', async () => {
    const fetchMock = mockApi({
      ...base,
      [`GET ${verificationPath}`]: status({ document_key: KEY }),
      'GET /storage/url': { body: { url: 'https://storage.example/signed?sig=1' } },
    })
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const { user } = renderWithProviders(<VerificationPage />)
    await openTeam(user)

    await user.click(await screen.findByRole('button', { name: 'Ver documento de Juan Pérez' }))

    await vi.waitFor(() => expect(open).toHaveBeenCalledWith('https://storage.example/signed?sig=1', '_blank', 'noopener,noreferrer'))
    const urlCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/storage/url'))
    expect(decodeURIComponent(String(urlCall?.[0]))).toContain(`key=${KEY}`)
  })
})
