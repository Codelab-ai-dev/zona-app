import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { match1, validationError } from '../test-fixtures'
import { MatchScheduleDialog } from './match-schedule-dialog'

function setup(handlers: Parameters<typeof mockApi>[0]) {
  const fetchMock = mockApi(handlers)
  const onSaved = vi.fn()
  const rendered = renderWithProviders(<MatchScheduleDialog match={match1} open onOpenChange={() => {}} onSaved={onSaved} />)
  return { fetchMock, onSaved, ...rendered }
}

describe('MatchScheduleDialog', () => {
  it('prefills the current schedule', () => {
    setup({})
    expect(screen.getByLabelText('Fecha')).toHaveValue('2024-06-15')
    expect(screen.getByLabelText('Hora')).toHaveValue('15:00')
    expect(screen.getByLabelText('Campo')).toHaveValue(1)
    expect(screen.getByLabelText('Jornada')).toHaveValue(1)
  })

  it('saves the new schedule with PATCH /matches/{id}/schedule', async () => {
    const { fetchMock, onSaved, user } = setup({ 'PATCH /matches/match-1/schedule': { body: match1 } })

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2024-06-20' } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '18:30' } })
    await user.clear(screen.getByLabelText('Campo'))
    await user.type(screen.getByLabelText('Campo'), '3')
    await user.clear(screen.getByLabelText('Jornada'))
    await user.type(screen.getByLabelText('Jornada'), '4')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Programación actualizada exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /matches/match-1/schedule')).toEqual([
      { match_date: '2024-06-20T18:30:00.000Z', match_time: '18:30', field_number: 3, round: 4 },
    ])
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('does not resend date and time when only the field changes', async () => {
    const { fetchMock, user } = setup({ 'PATCH /matches/match-1/schedule': { body: match1 } })

    await user.clear(screen.getByLabelText('Campo'))
    await user.type(screen.getByLabelText('Campo'), '2')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await screen.findByText('Programación actualizada exitosamente')
    expect(requestsTo(fetchMock, 'PATCH /matches/match-1/schedule')).toEqual([{ field_number: 2, round: 1 }])
  })

  it('maps a 422 to the field with aria-invalid and keeps the typed value', async () => {
    const { onSaved, user } = setup({
      'PATCH /matches/match-1/schedule': validationError({ round: 'debe ser mayor que 0' }),
    })

    const round = screen.getByLabelText('Jornada')
    await user.clear(round)
    await user.type(round, '0')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const message = await screen.findByText('debe ser mayor que 0')
    expect(round).toHaveAttribute('aria-invalid', 'true')
    expect(round).toHaveAttribute('aria-describedby', message.id)
    expect(round).toHaveValue(0)
    expect(screen.getByLabelText('Campo')).toHaveAttribute('aria-invalid', 'false')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('shows only the toast (no field errors) when the API error has no fields', async () => {
    const { user } = setup({
      'PATCH /matches/match-1/schedule': { status: 403, body: { error: { code: 'forbidden', message: 'No tienes permiso' } } },
    })

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
    for (const label of ['Fecha', 'Hora', 'Campo', 'Jornada']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'false')
    }
  })
})
