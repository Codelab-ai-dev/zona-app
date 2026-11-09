import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, list, mineOne, tournament, whatsappLink } from '../test-fixtures'
import { WhatsAppPageComponent } from './whatsapp'

const linksRoute = 'GET /leagues/league-1/whatsapp-links'
const createRoute = 'POST /leagues/league-1/whatsapp-links'
const putRoute = 'PUT /whatsapp-links/wa-1'
const users = [{ id: 'user-9', name: 'Ana Pérez', email: 'ana@liga.mx', role: 'league_admin', is_active: true }]
const base = {
  ...mineOne,
  'GET /leagues/league-1/tournaments': list([tournament(), tournament({ id: 'tour-2', name: 'Clausura', is_active: false })]),
  'GET /leagues/league-1/users': list(users),
}

describe('WhatsApp: create with tournament, language and user', () => {
  it('posts tournament_id, preferred_language and user_id, taking the role and name from the user', async () => {
    const fetchMock = mockApi({ ...base, [linksRoute]: list([]), [createRoute]: { status: 201, body: whatsappLink() } })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: /nuevo vínculo/i }))
    await user.click(screen.getByLabelText('Usuario (opcional)'))
    await user.click(await screen.findByRole('option', { name: /Ana Pérez/ }))
    await user.type(screen.getByLabelText('Número de WhatsApp'), '5215512345678')
    await user.click(screen.getByLabelText('Torneo Activo'))
    await user.click(await screen.findByRole('option', { name: 'Clausura' }))
    await user.click(screen.getByLabelText('Idioma Preferido'))
    await user.click(await screen.findByRole('option', { name: 'English' }))
    await user.click(screen.getByRole('button', { name: 'Crear Vínculo' }))

    expect(await screen.findByText('Vínculo de WhatsApp creado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, createRoute)).toEqual([
      {
        phone_number: '5215512345678',
        role: 'league_admin',
        display_name: 'Ana Pérez',
        preferred_language: 'en',
        user_id: 'user-9',
        tournament_id: 'tour-2',
      },
    ])
  })

  it('shows the 422 on tournament_id next to the field and keeps the input', async () => {
    mockApi({
      ...base,
      [linksRoute]: list([]),
      [createRoute]: apiError(422, 'validation', 'datos inválidos', { tournament_id: 'el torneo no pertenece a la liga' }),
    })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: /nuevo vínculo/i }))
    await user.type(screen.getByLabelText('Número de WhatsApp'), '5215512345678')
    await user.click(screen.getByLabelText('Torneo Activo'))
    await user.click(await screen.findByRole('option', { name: /Apertura 2026/ }))
    await user.click(screen.getByRole('button', { name: 'Crear Vínculo' }))

    expect(await screen.findByText('el torneo no pertenece a la liga')).toBeInTheDocument()
    expect(screen.getByLabelText('Torneo Activo')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Número de WhatsApp')).toHaveValue('5215512345678')
  })
})

describe('WhatsApp: edit and activate/deactivate', () => {
  it('edits name, language and tournament: PUT /whatsapp-links/{id}', async () => {
    const fetchMock = mockApi({ ...base, [linksRoute]: list([whatsappLink()]), [putRoute]: { body: whatsappLink() } })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Editar vínculo de TESORERIA' }))
    expect(screen.getByLabelText('Número de WhatsApp')).toBeEnabled()
    const name = screen.getByLabelText('Nombre para Mostrar (Opcional)')
    await user.clear(name)
    await user.type(name, 'presidencia')
    await user.click(screen.getByLabelText('Torneo Activo'))
    await user.click(await screen.findByRole('option', { name: /Apertura 2026/ }))
    await user.click(screen.getByLabelText('Idioma Preferido'))
    await user.click(await screen.findByRole('option', { name: 'English' }))
    await user.click(screen.getByRole('button', { name: 'Actualizar Vínculo' }))

    expect(await screen.findByText('Vínculo actualizado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, putRoute)).toEqual([
      { display_name: 'PRESIDENCIA', preferred_language: 'en', tournament_id: 'tour-1' },
    ])
    expect(requestsTo(fetchMock, linksRoute).length).toBeGreaterThanOrEqual(2)
  })

  it('clears the tournament with the nil UUID', async () => {
    const fetchMock = mockApi({ ...base, [linksRoute]: list([whatsappLink({ tournament_id: 'tour-1' })]), [putRoute]: { body: whatsappLink() } })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Editar vínculo de TESORERIA' }))
    await user.click(screen.getByLabelText('Torneo Activo'))
    await user.click(await screen.findByRole('option', { name: 'Sin torneo' }))
    await user.click(screen.getByRole('button', { name: 'Actualizar Vínculo' }))

    await screen.findByText('Vínculo actualizado exitosamente')
    expect(requestsTo(fetchMock, putRoute)).toEqual([
      expect.objectContaining({ tournament_id: '00000000-0000-0000-0000-000000000000' }),
    ])
  })

  it('shows the API error in the edit dialog and keeps it open', async () => {
    mockApi({ ...base, [linksRoute]: list([whatsappLink()]), [putRoute]: apiError(403, 'forbidden', 'No tienes permiso') })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Editar vínculo de TESORERIA' }))
    await user.click(screen.getByRole('button', { name: 'Actualizar Vínculo' }))

    expect((await screen.findAllByText('No tienes permiso')).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Nombre para Mostrar (Opcional)')).toHaveValue('TESORERIA')
  })

  it('deactivates and activates a link with PUT is_active', async () => {
    const fetchMock = mockApi({
      ...base,
      [linksRoute]: list([whatsappLink(), whatsappLink({ id: 'wa-2', display_name: 'ARBITROS', is_active: false })]),
      [putRoute]: { body: whatsappLink() },
      'PUT /whatsapp-links/wa-2': { body: whatsappLink() },
    })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Desactivar vínculo de TESORERIA' }))
    expect(await screen.findByText('Vínculo desactivado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, putRoute)).toEqual([{ is_active: false }])

    await user.click(screen.getByRole('button', { name: 'Activar vínculo de ARBITROS' }))
    expect(await screen.findByText('Vínculo activado')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PUT /whatsapp-links/wa-2')).toEqual([{ is_active: true }])
  })
})

describe('WhatsApp: change the phone of a link', () => {
  it('sends the normalised phone only when it changed', async () => {
    const fetchMock = mockApi({ ...base, [linksRoute]: list([whatsappLink()]), [putRoute]: { body: whatsappLink() } })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Editar vínculo de TESORERIA' }))
    const phone = screen.getByLabelText('Número de WhatsApp')
    await user.clear(phone)
    await user.type(phone, '+52 (55) 9999-0000')
    await user.click(screen.getByRole('button', { name: 'Actualizar Vínculo' }))

    expect(await screen.findByText('Vínculo actualizado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, putRoute)).toEqual([expect.objectContaining({ phone_number: '525599990000' })])
  })

  it('shows the 409 next to the phone field and keeps the typed value', async () => {
    mockApi({ ...base, [linksRoute]: list([whatsappLink()]), [putRoute]: apiError(409, 'conflict', 'El recurso ya existe') })
    const { user } = renderWithProviders(<WhatsAppPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Editar vínculo de TESORERIA' }))
    const phone = screen.getByLabelText('Número de WhatsApp')
    await user.clear(phone)
    await user.type(phone, '5215599990000')
    await user.click(screen.getByRole('button', { name: 'Actualizar Vínculo' }))

    expect(await screen.findByText('Este número de teléfono ya está vinculado')).toBeInTheDocument()
    expect(phone).toHaveAttribute('aria-invalid', 'true')
    expect(phone).toHaveValue('5215599990000')
  })
})
