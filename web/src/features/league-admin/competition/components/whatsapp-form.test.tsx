import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { WhatsAppPage } from './whatsapp-page'

/**
 * REFERENCE MUTATION TEST (see web/CONVENTIONS.md → Testing mutations).
 * A mutation test must: drive the UI like a user (userEvent), assert the
 * exact request the API received (requestsTo), and assert what the user
 * sees afterwards (toast, refreshed data or field error).
 */
const emptyLinks = { body: { data: [], page: { limit: 100, offset: 0 } } }

async function openFormAndFill(user: ReturnType<typeof renderWithProviders>['user'], phone: string) {
  await user.click(await screen.findByRole('button', { name: /nuevo vínculo/i }))
  await user.type(screen.getByLabelText(/número de teléfono/i), phone)
  await user.type(screen.getByLabelText(/nombre/i), 'tesoreria')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
}

describe('WhatsApp link creation', () => {
  it('posts the link to the current league and confirms', async () => {
    const fetchMock = mockApi({
      'GET /leagues/league-1/whatsapp-links': emptyLinks,
      'POST /leagues/league-1/whatsapp-links': { status: 201, body: { id: 'w1', phone_number: '5215512345678' } },
    })
    const { user } = renderWithProviders(<WhatsAppPage leagueId="league-1" />)

    await openFormAndFill(user, '5215512345678')

    expect(await screen.findByText('Enlace de WhatsApp creado correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /leagues/league-1/whatsapp-links')).toEqual([
      expect.objectContaining({ phone_number: '5215512345678', display_name: 'TESORERIA' }),
    ])
  })

  it('shows the duplicate-phone error next to the field and keeps the value', async () => {
    mockApi({
      'GET /leagues/league-1/whatsapp-links': emptyLinks,
      'POST /leagues/league-1/whatsapp-links': { status: 409, body: { error: { code: 'conflict', message: 'El recurso ya existe' } } },
    })
    const { user } = renderWithProviders(<WhatsAppPage leagueId="league-1" />)

    await openFormAndFill(user, '5215512345678')

    const phone = screen.getByLabelText(/número de teléfono/i)
    expect(await screen.findByText('Este número ya está registrado')).toBeInTheDocument()
    expect(phone).toHaveAttribute('aria-invalid', 'true')
    expect(phone).toHaveValue('5215512345678')
  })
})
