import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { match1, validationError } from '../test-fixtures'
import { RefereeReportDialog } from './referee-report-dialog'

const existing = {
  id: 'rr-1',
  match_id: 'match-1',
  referee_name: 'Juan Pérez',
  assistant_referee_1: 'Luis Gómez',
  weather_conditions: 'Soleado',
  created_at: '2024-06-15T18:00:00Z',
  updated_at: '2024-06-15T18:00:00Z',
}
const notFound = { status: 404, body: { error: { code: 'not_found', message: 'No encontrado' } } }

function setup(handlers: Parameters<typeof mockApi>[0]) {
  const fetchMock = mockApi(handlers)
  const onOpenChange = vi.fn()
  const rendered = renderWithProviders(<RefereeReportDialog match={match1} open onOpenChange={onOpenChange} />)
  return { fetchMock, onOpenChange, ...rendered }
}

describe('RefereeReportDialog', () => {
  it('shows the existing report read-only', async () => {
    setup({ 'GET /matches/match-1/referee-report': { body: existing } })
    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Luis Gómez')).toBeInTheDocument()
    expect(screen.getByText('Soleado')).toBeInTheDocument()
    expect(screen.queryByLabelText('Árbitro Principal')).not.toBeInTheDocument()
  })

  it('loads the report, lets the admin edit it and posts the full body', async () => {
    const { fetchMock, onOpenChange, user } = setup({
      'GET /matches/match-1/referee-report': { body: existing },
      'POST /matches/match-1/referee-report': { body: existing },
    })

    await user.click(await screen.findByRole('button', { name: 'Editar Informe' }))
    const name = screen.getByLabelText('Árbitro Principal')
    expect(name).toHaveValue('Juan Pérez')
    await user.type(name, ' jr')
    await user.type(screen.getByLabelText('Observaciones Generales'), 'sin incidentes')
    await user.click(screen.getByRole('button', { name: 'Guardar Informe' }))

    expect(await screen.findByText('Informe del árbitro guardado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /matches/match-1/referee-report')).toEqual([
      {
        referee_name: 'JUAN PÉREZ JR',
        assistant_referee_1: 'Luis Gómez',
        weather_conditions: 'Soleado',
        general_observations: 'SIN INCIDENTES',
      },
    ])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('treats a 404 as "no report yet": empty form instead of an error screen, and creates the report', async () => {
    const { fetchMock, user } = setup({
      'GET /matches/match-1/referee-report': notFound,
      'POST /matches/match-1/referee-report': { status: 201, body: existing },
    })

    const name = await screen.findByLabelText('Árbitro Principal')
    expect(name).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('No encontrado')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()

    await user.type(name, 'maría')
    await user.click(screen.getByRole('button', { name: 'Guardar Informe' }))

    expect(await screen.findByText('Informe del árbitro guardado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /matches/match-1/referee-report')).toEqual([{ referee_name: 'MARÍA' }])
  })

  it('maps a 422 to the field with aria-invalid and keeps the value', async () => {
    const { user } = setup({
      'GET /matches/match-1/referee-report': notFound,
      'POST /matches/match-1/referee-report': validationError({ referee_name: 'demasiado largo' }),
    })

    const name = await screen.findByLabelText('Árbitro Principal')
    await user.type(name, 'pedro')
    await user.click(screen.getByRole('button', { name: 'Guardar Informe' }))

    const message = await screen.findByText('demasiado largo')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAttribute('aria-describedby', message.id)
    expect(name).toHaveValue('PEDRO')
  })

  it('shows an error with retry when the report fails to load for a reason other than 404', async () => {
    setup({ 'GET /matches/match-1/referee-report': { status: 500, body: { error: { code: 'internal', message: 'Falla del servidor' } } } })
    expect(await screen.findByText('Falla del servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Árbitro Principal')).not.toBeInTheDocument()
  })
})
