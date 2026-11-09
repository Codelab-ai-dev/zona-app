import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { list, mineOne, tournament, whatsappLink } from '../test-fixtures'
import { WhatsAppPageComponent } from './whatsapp'

const linksRoute = 'GET /leagues/league-1/whatsapp-links'
const createRoute = 'POST /leagues/league-1/whatsapp-links'
const users = [{ id: 'user-9', name: 'Ana Pérez', email: 'ana@liga.mx', role: 'league_admin', is_active: true }]
const base = {
  ...mineOne,
  'GET /leagues/league-1/tournaments': list([tournament({ id: 'tour-0', name: 'Viejo', is_active: false }), tournament()]),
  'GET /leagues/league-1/users': list(users),
}

describe('WhatsApp parity with the original', () => {
  it('creates a link from a phone typed with spaces and +, preselecting the active tournament', async () => {
    const fetchMock = mockApi({ ...base, [linksRoute]: list([]), [createRoute]: { status: 201, body: whatsappLink() } })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: /nuevo vínculo/i }))
    expect(screen.getByText(/código de país \(ejemplo: \+5215512345678\)/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear Vínculo' })).toBeDisabled()
    await user.type(screen.getByLabelText('Número de WhatsApp'), '+52 (55) 1234-5678')
    await waitFor(() => expect(screen.getByLabelText('Torneo Activo')).toHaveTextContent('Apertura 2026'))
    await user.click(screen.getByRole('button', { name: 'Crear Vínculo' }))

    expect(await screen.findByText('Vínculo de WhatsApp creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, createRoute)).toEqual([
      { phone_number: '525512345678', role: 'team_owner', preferred_language: 'es', tournament_id: 'tour-1' },
    ])
  })

  it('rejects a malformed phone next to the field and sends nothing', async () => {
    const fetchMock = mockApi({ ...base, [linksRoute]: list([]) })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: /nuevo vínculo/i }))
    await user.type(screen.getByLabelText('Número de WhatsApp'), '12345')
    await user.click(screen.getByRole('button', { name: 'Crear Vínculo' }))

    expect(await screen.findByText('Formato de teléfono inválido. Debe ser: +52XXXXXXXXXX')).toBeInTheDocument()
    expect(screen.getByLabelText('Número de WhatsApp')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Número de WhatsApp')).toHaveValue('12345')
    expect(requestsTo(fetchMock, createRoute)).toEqual([])
  })

  it('shows the account email and the time since the last interaction', async () => {
    const recent = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    mockApi({
      ...base,
      [linksRoute]: list([whatsappLink({ user_id: 'user-9', last_interaction_at: recent }), whatsappLink({ id: 'wa-2', display_name: undefined, phone_number: '5215599990000' })]),
    })
    renderWithProviders(<WhatsAppPageComponent />)

    expect(await screen.findByText('ana@liga.mx')).toBeInTheDocument()
    expect(screen.getByText('hace 3 días')).toBeInTheDocument()
    expect(screen.getByText('Sin interacciones')).toBeInTheDocument()
    expect(screen.getByText('Sin email')).toBeInTheDocument()
  })
})
