import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { TEAM_ID, serverError, team } from '../test-fixtures'
import { TeamUniformsPage } from './team-uniforms-page'

const GET = `GET /teams/${TEAM_ID}`
const PATCH = `PATCH /teams/${TEAM_ID}`
const coloredTeam = { ...team, home_primary_color: '#FF0000', away_primary_color: '#0000FF' }

describe('TeamUniformsPage', () => {
  it('shows the colors saved on the team (not placeholders)', async () => {
    mockApi({ [GET]: { body: coloredTeam } })
    renderWithProviders(<TeamUniformsPage teamId={TEAM_ID} />)

    expect(await screen.findByLabelText('Color Primario (Local) (hex)')).toHaveValue('#FF0000')
    expect(screen.getByLabelText('Color Primario (Local)')).toHaveValue('#ff0000')
    expect(screen.getByLabelText('Color Primario (Visitante) (hex)')).toHaveValue('#0000FF')
    expect(screen.getByLabelText('Shorts Alternativos 1 (hex)')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Guardar Cambios' })).toBeDisabled()
  })

  it('shows the API error and retries', async () => {
    mockApi({ [GET]: serverError })
    const { user } = renderWithProviders(<TeamUniformsPage teamId={TEAM_ID} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor')
    mockApi({ [GET]: { body: coloredTeam } })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByLabelText('Color Primario (Local) (hex)')).toHaveValue('#FF0000')
  })

  it('sends only the changed colors, confirms and refreshes the team', async () => {
    const fetchMock = mockApi({ [GET]: { body: coloredTeam }, [PATCH]: { body: coloredTeam } })
    const { user } = renderWithProviders(<TeamUniformsPage teamId={TEAM_ID} />)

    const hex = await screen.findByLabelText('Color Secundario (Local) (hex)')
    await user.type(hex, '#00ff00')
    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('Equipo actualizado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, PATCH)).toEqual([{ home_secondary_color: '#00FF00' }])
    expect(requestsTo(fetchMock, GET)).toHaveLength(2)
  })

  it('discards pending edits on Cancelar', async () => {
    const fetchMock = mockApi({ [GET]: { body: coloredTeam } })
    const { user } = renderWithProviders(<TeamUniformsPage teamId={TEAM_ID} />)

    const hex = await screen.findByLabelText('Color Primario (Local) (hex)')
    await user.clear(hex)
    await user.type(hex, '#123456')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(hex).toHaveValue('#FF0000')
    expect(requestsTo(fetchMock, PATCH)).toEqual([])
  })

  it('shows the 422 hex error on the field and keeps the typed value', async () => {
    mockApi({
      [GET]: { body: coloredTeam },
      [PATCH]: {
        status: 422,
        body: {
          error: {
            code: 'validation_failed',
            message: 'Datos inválidos',
            fields: { home_primary_color: 'debe ser un color hex válido (#RRGGBB)' },
          },
        },
      },
    })
    const { user } = renderWithProviders(<TeamUniformsPage teamId={TEAM_ID} />)

    const hex = await screen.findByLabelText('Color Primario (Local) (hex)')
    await user.clear(hex)
    await user.type(hex, 'rojo')
    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('debe ser un color hex válido (#RRGGBB)')).toBeInTheDocument()
    expect(hex).toHaveAttribute('aria-invalid', 'true')
    expect(hex).toHaveValue('ROJO')
    expect(screen.queryByText('Equipo actualizado')).not.toBeInTheDocument()
  })
})
