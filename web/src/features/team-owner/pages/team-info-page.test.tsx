import { screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { TEAM_ID, serverError, team } from '../test-fixtures'
import { TeamInfoPage } from './team-info-page'

const GET = `GET /teams/${TEAM_ID}`
const PATCH = `PATCH /teams/${TEAM_ID}`
const empty = { body: { data: [], page: { limit: 100, offset: 0 } } }
// The player statistics section below the card loads its own data.
const sideData = { [`GET /teams/${TEAM_ID}/player-stats`]: empty, [`GET /teams/${TEAM_ID}/stats`]: empty }

function renderPage() {
  return renderWithProviders(<TeamInfoPage teamId={TEAM_ID} />)
}

async function editName(user: ReturnType<typeof renderPage>['user']) {
  await user.click(await screen.findByRole('button', { name: /Editar/i }))
  const dialog = await screen.findByRole('dialog')
  const name = within(dialog).getByLabelText('Nombre del Equipo')
  await user.clear(name)
  await user.type(name, 'Halcones')
  await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
  return dialog
}

describe('TeamInfoPage', () => {
  it('shows the team details', async () => {
    mockApi({ [GET]: { body: { ...team, description: 'Equipo histórico', group_name: 'A' } } })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Águilas FC' })).toBeInTheDocument()
    expect(screen.getByText('/aguilas-fc')).toBeInTheDocument()
    expect(screen.getByText('Equipo histórico')).toBeInTheDocument()
    expect(screen.getByText('Estado: Activo')).toBeInTheDocument()
    expect(screen.getByText('Fundado: 1 de enero de 2024')).toBeInTheDocument()
  })

  it('shows the API error and reloads on retry', async () => {
    mockApi({ [GET]: serverError, ...sideData })
    const { user } = renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    mockApi({ [GET]: { body: team }, ...sideData })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'Águilas FC' })).toBeInTheDocument()
  })

  it('patches the team, closes the form and refreshes the data', async () => {
    const fetchMock = mockApi({
      [GET]: { body: team },
      [PATCH]: { body: { ...team, name: 'HALCONES' } },
    })
    const { user } = renderPage()

    await editName(user)

    expect(await screen.findByText('Equipo actualizado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, PATCH)).toEqual([{ name: 'HALCONES' }])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, GET)).toHaveLength(2)
  })

  it('shows the 422 name error, keeps the value and the form open', async () => {
    mockApi({
      [GET]: { body: team },
      [PATCH]: {
        status: 422,
        body: { error: { code: 'validation_failed', message: 'Datos inválidos', fields: { name: 'nombre ya en uso' } } },
      },
    })
    const { user } = renderPage()

    const dialog = await editName(user)

    const name = within(dialog).getByLabelText('Nombre del Equipo')
    expect(await within(dialog).findByText('nombre ya en uso')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveValue('HALCONES')
    expect(screen.queryByText('Equipo actualizado')).not.toBeInTheDocument()
  })
})
