import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, list, mineOne, tournament, whatsappLink } from '../test-fixtures'
import { WhatsAppPageComponent } from './whatsapp'

const linksRoute = 'GET /leagues/league-1/whatsapp-links'

describe('WhatsApp page: links', () => {
  it('lists the linked numbers', async () => {
    mockApi({ ...mineOne, [linksRoute]: list([whatsappLink(), whatsappLink({ id: 'wa-2', display_name: undefined, phone_number: '5215599990000', is_active: false })]) })
    renderWithProviders(<WhatsAppPageComponent />)

    expect(await screen.findByText('TESORERIA')).toBeInTheDocument()
    expect(screen.getByText('+5215512345678')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    mockApi({ ...mineOne, [linksRoute]: list([]) })
    renderWithProviders(<WhatsAppPageComponent />)

    expect(await screen.findByText('No hay vínculos de WhatsApp')).toBeInTheDocument()
  })

  it('shows the API error', async () => {
    mockApi({ ...mineOne, [linksRoute]: apiError(500, 'internal', 'Falla en enlaces') })
    renderWithProviders(<WhatsAppPageComponent />)

    expect(await screen.findByText('Falla en enlaces')).toBeInTheDocument()
  })

  it('creates a link in the selected league (not a literal placeholder) and refreshes the list', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      [linksRoute]: list([]),
      'POST /leagues/league-1/whatsapp-links': { status: 201, body: whatsappLink() },
    })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: /nuevo vínculo/i }))
    await user.type(screen.getByLabelText('Número de WhatsApp'), '5215512345678')
    await user.click(screen.getByRole('button', { name: 'Crear Vínculo' }))

    expect(await screen.findByText('Vínculo de WhatsApp creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /leagues/league-1/whatsapp-links')).toEqual([
      { phone_number: '5215512345678', role: 'team_owner', preferred_language: 'es' },
    ])
    expect(requestsTo(fetchMock, linksRoute).length).toBeGreaterThanOrEqual(2)
  })

  it('asks for confirmation before deleting and then calls DELETE /whatsapp-links/{id}', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      [linksRoute]: list([whatsappLink()]),
      'DELETE /whatsapp-links/wa-1': { status: 204 },
    })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar vínculo de TESORERIA' }))
    expect(requestsTo(fetchMock, 'DELETE /whatsapp-links/wa-1')).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Vínculo eliminado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /whatsapp-links/wa-1')).toHaveLength(1)
  })

  it('keeps the link when the delete confirmation is dismissed', async () => {
    const fetchMock = mockApi({ ...mineOne, [linksRoute]: list([whatsappLink()]) })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar vínculo de TESORERIA' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(0)
  })
})

describe('WhatsApp page: round broadcast', () => {
  const routes = {
    ...mineOne,
    [linksRoute]: list([whatsappLink()]),
    'GET /leagues/league-1/tournaments': list([tournament()]),
  }
  const send = 'POST /notifications/leagues/league-1'

  it('sends the round to the league and reports the delivery summary', async () => {
    const fetchMock = mockApi({ ...routes, [send]: { body: { sent: 4, failed: 1, skipped: 2 } } })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Enviar jornada' }))
    await user.click(screen.getByLabelText('Torneo'))
    await user.click(await screen.findByRole('option', { name: 'Apertura 2026' }))
    await user.type(screen.getByLabelText('Jornada'), '3')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Jornada enviada: 4 enviados, 1 fallidos, 2 omitidos')).toBeInTheDocument()
    expect(requestsTo(fetchMock, send)).toEqual([{ league_id: 'league-1', tournament_id: 'tour-1', round: 3 }])
  })

  it('validates tournament and round before sending', async () => {
    const fetchMock = mockApi({ ...routes })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Enviar jornada' }))
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Ingresa una jornada válida (1 o más)')).toBeInTheDocument()
    expect(screen.getByLabelText('Jornada')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Torneo')).toHaveAccessibleDescription('Selecciona un torneo')
    expect(requestsTo(fetchMock, send)).toEqual([])
  })

  it('shows the API error and keeps the dialog open', async () => {
    mockApi({ ...routes, [send]: apiError(403, 'forbidden', 'No puedes notificar esta liga') })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Enviar jornada' }))
    await user.click(screen.getByLabelText('Torneo'))
    await user.click(await screen.findByRole('option', { name: 'Apertura 2026' }))
    await user.type(screen.getByLabelText('Jornada'), '1')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('No puedes notificar esta liga')).toBeInTheDocument()
    expect(screen.getByLabelText('Jornada')).toHaveValue(1)
  })
})
