import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { TEAM_ID, listBody, player, serverError, team } from '../test-fixtures'
import { PlayerManagementPage } from './player-management-page'

const PLAYERS = `GET /teams/${TEAM_ID}/players`
const CREATE = `POST /teams/${TEAM_ID}/players`
const TEAM = `GET /teams/${TEAM_ID}`

function renderPage() {
  return renderWithProviders(<PlayerManagementPage teamId={TEAM_ID} />)
}

async function openForm(user: ReturnType<typeof renderPage>['user']) {
  await user.click(await screen.findByRole('button', { name: /Nuevo Jugador/i }))
  return screen.findByRole('dialog')
}

async function fillForm(dialog: HTMLElement, user: ReturnType<typeof renderPage>['user']) {
  await user.type(within(dialog).getByLabelText('Nombre Completo'), 'Luis Gómez')
  await user.click(within(dialog).getByRole('combobox', { name: 'Posición' }))
  await user.click(await screen.findByRole('option', { name: 'Portero' }))
  await user.type(within(dialog).getByLabelText('Número de Camiseta'), '9')
  await user.type(within(dialog).getByLabelText('Fecha de Nacimiento'), '2002-04-10')
}

describe('PlayerManagementPage', () => {
  it('lists the team players', async () => {
    mockApi({ [PLAYERS]: listBody([player]), [TEAM]: { body: team } })
    renderPage()

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('#10')).toBeInTheDocument()
    expect(screen.getByText('Delantero')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
  })

  it('shows the empty state without a dead action button', async () => {
    mockApi({ [PLAYERS]: listBody([]), [TEAM]: { body: team } })
    renderPage()

    expect(await screen.findByText('Sin jugadores')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Nuevo Jugador/i })).toHaveLength(1)
  })

  it('shows the API error and reloads the list on retry', async () => {
    mockApi({ [PLAYERS]: serverError, [TEAM]: { body: team } })
    const { user } = renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')

    mockApi({ [PLAYERS]: listBody([player]), [TEAM]: { body: team } })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
  })

  it('creates a player for this team (uppercased, RFC 3339 birth date), closes the form and reloads', async () => {
    const fetchMock = mockApi({
      [PLAYERS]: listBody([player]),
      [TEAM]: { body: team },
      [CREATE]: { status: 201, body: { ...player, id: 'player-2', name: 'LUIS GÓMEZ' } },
    })
    const { user } = renderPage()

    const dialog = await openForm(user)
    await fillForm(dialog, user)
    await user.click(within(dialog).getByRole('button', { name: 'Registrar Jugador' }))

    expect(await screen.findByText('Jugador agregado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, CREATE)).toEqual([
      { name: 'LUIS GÓMEZ', position: 'Portero', jersey_number: 9, birth_date: '2002-04-10T00:00:00Z' },
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, PLAYERS)).toHaveLength(2)
  })

  it('uploads the chosen photo to the new player and saves its URL', async () => {
    const fetchMock = mockApi({
      [PLAYERS]: listBody([]),
      [TEAM]: { body: team },
      [CREATE]: { status: 201, body: { ...player, id: 'player-2' } },
      'POST /storage/objects': {
        status: 201,
        body: { key: 'player/player-2/abc.png', url: 'https://cdn.example.com/player/player-2/abc.png', is_public: true },
      },
      'PATCH /players/player-2': { body: { ...player, id: 'player-2' } },
    })
    const { user } = renderPage()

    const dialog = await openForm(user)
    await fillForm(dialog, user)
    const file = new File(['png-bytes'], 'foto.png', { type: 'image/png' })
    await user.upload(within(dialog).getByLabelText('Foto del Jugador'), file)
    expect(await within(dialog).findByText(/Foto seleccionada: foto\.png/)).toBeInTheDocument()
    expect(await within(dialog).findByAltText('Vista previa')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Registrar Jugador' }))

    await screen.findByText('Jugador agregado')
    await waitFor(() => expect(requestsTo(fetchMock, 'PATCH /players/player-2')).toHaveLength(1))

    const [form] = requestsTo(fetchMock, 'POST /storage/objects') as FormData[]
    expect(form?.get('scope')).toBe('player')
    expect(form?.get('scope_id')).toBe('player-2')
    expect((form?.get('file') as File).name).toBe('foto.png')
    expect(requestsTo(fetchMock, 'PATCH /players/player-2')).toEqual([
      { photo: 'https://cdn.example.com/player/player-2/abc.png' },
    ])
    // the create request itself never carries the photo
    expect(requestsTo(fetchMock, CREATE)[0]).not.toHaveProperty('photo')
  })

  it('rejects files that are not images before uploading anything', async () => {
    const fetchMock = mockApi({ [PLAYERS]: listBody([]), [TEAM]: { body: team } })
    const { user } = renderPage()

    const dialog = await openForm(user)
    const input = within(dialog).getByLabelText('Foto del Jugador')
    // bypass the accept filter like a drag and drop would
    await userEvent.setup({ applyAccept: false }).upload(input, new File(['x'], 'doc.pdf', { type: 'application/pdf' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El tipo de archivo debe ser JPEG, PNG o WebP')
    expect(requestsTo(fetchMock, 'POST /storage/objects')).toEqual([])
  })

  it('shows 422 errors on the fields, keeps the typed values and keeps the form open', async () => {
    mockApi({
      [PLAYERS]: listBody([]),
      [TEAM]: { body: team },
      [CREATE]: {
        status: 422,
        body: {
          error: {
            code: 'validation_failed',
            message: 'Datos inválidos',
            fields: { jersey_number: 'debe estar entre 1 y 99', name: 'requerido' },
          },
        },
      },
    })
    const { user } = renderPage()

    const dialog = await openForm(user)
    await fillForm(dialog, user)
    await user.click(within(dialog).getByRole('button', { name: 'Registrar Jugador' }))

    const jersey = within(dialog).getByLabelText('Número de Camiseta')
    expect(await within(dialog).findByText('debe estar entre 1 y 99')).toBeInTheDocument()
    expect(jersey).toHaveAttribute('aria-invalid', 'true')
    expect(jersey).toHaveAttribute('aria-describedby', 'jersey_number-error')
    expect(jersey).toHaveValue(9)
    const name = within(dialog).getByLabelText('Nombre Completo')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveValue('LUIS GÓMEZ')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // field errors are shown inline, not as a toast
    expect(screen.queryByText('Jugador agregado')).not.toBeInTheDocument()
  })

  it('toasts the API message when the create fails for a non-validation reason', async () => {
    mockApi({
      [PLAYERS]: listBody([]),
      [TEAM]: { body: team },
      [CREATE]: { status: 403, body: { error: { code: 'forbidden', message: 'No tienes permiso para este equipo' } } },
    })
    const { user } = renderPage()

    const dialog = await openForm(user)
    await fillForm(dialog, user)
    await user.click(within(dialog).getByRole('button', { name: 'Registrar Jugador' }))

    expect(await screen.findByText('No tienes permiso para este equipo')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('asks for confirmation before deactivating, then calls the API and reloads', async () => {
    const fetchMock = mockApi({
      [PLAYERS]: listBody([player]),
      [TEAM]: { body: team },
      'POST /players/player-1/deactivate': { status: 204 },
    })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Desactivar a Juan Pérez' }))
    const confirm = await screen.findByRole('alertdialog')
    expect(requestsTo(fetchMock, 'POST /players/player-1/deactivate')).toEqual([])

    await user.click(within(confirm).getByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByText('Jugador desactivado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /players/player-1/deactivate')).toHaveLength(1)
    expect(requestsTo(fetchMock, PLAYERS)).toHaveLength(2)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('does not call the API when the deactivation is cancelled', async () => {
    const fetchMock = mockApi({ [PLAYERS]: listBody([player]), [TEAM]: { body: team } })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Desactivar a Juan Pérez' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /players/player-1/deactivate')).toEqual([])
  })

  it('opens the player credential with the team name', async () => {
    mockApi({ [PLAYERS]: listBody([player]), [TEAM]: { body: team } })
    const { user } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Credencial de Juan Pérez' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Credencial de Jugador')).toBeInTheDocument()
    expect(within(dialog).getByText('Equipo:').nextSibling).toHaveTextContent('Águilas FC')
  })
})
