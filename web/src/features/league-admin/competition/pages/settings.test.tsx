import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { apiError, league, list, mineOne } from '../test-fixtures'
import { SettingsPageComponent } from './settings'

const getLeague = 'GET /leagues/league-1'

describe('Settings page', () => {
  it('shows the league data in the form', async () => {
    mockApi({ ...mineOne, [getLeague]: { body: league() } })
    renderWithProviders(<SettingsPageComponent />)

    expect(await screen.findByLabelText('Nombre de la Liga')).toHaveValue('Liga Norte')
    expect(screen.getByLabelText('URL Slug')).toHaveValue('liga-norte')
    expect(screen.getByLabelText('Descripción')).toHaveValue('Liga de prueba')
  })

  it('shows the API error', async () => {
    mockApi({ ...mineOne, [getLeague]: apiError(500, 'internal', 'Falla al cargar la liga') })
    renderWithProviders(<SettingsPageComponent />)

    expect(await screen.findByText('Falla al cargar la liga')).toBeInTheDocument()
  })

  it('saves name, slug (lowercase) and description with PATCH /leagues/{id}', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      [getLeague]: { body: league() },
      'PATCH /leagues/league-1': { body: league({ name: 'LIGA SUR' }) },
    })
    const { user } = renderWithProviders(<SettingsPageComponent />)

    const name = await screen.findByLabelText('Nombre de la Liga')
    await user.clear(name)
    await user.type(name, 'Liga Sur')
    const slug = screen.getByLabelText('URL Slug')
    await user.clear(slug)
    await user.type(slug, 'Liga-Sur')
    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('Liga actualizada correctamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'PATCH /leagues/league-1')).toEqual([
      { name: 'LIGA SUR', slug: 'liga-sur', description: 'Liga de prueba' },
    ])
    // league detail and my-leagues are refetched
    expect(requestsTo(fetchMock, getLeague).length).toBeGreaterThanOrEqual(2)
    expect(requestsTo(fetchMock, 'GET /leagues/mine').length).toBeGreaterThanOrEqual(2)
  })

  it('can clear the name field without it being reset to the saved value', async () => {
    mockApi({ ...mineOne, [getLeague]: { body: league() } })
    const { user } = renderWithProviders(<SettingsPageComponent />)

    const name = await screen.findByLabelText('Nombre de la Liga')
    await user.clear(name)

    expect(name).toHaveValue('')
  })

  it('shows 422 field errors next to the field and keeps the typed value', async () => {
    mockApi({
      ...mineOne,
      [getLeague]: { body: league() },
      'PATCH /leagues/league-1': apiError(422, 'validation_failed', 'Datos inválidos', { slug: 'ya está en uso' }),
    })
    const { user } = renderWithProviders(<SettingsPageComponent />)

    const slug = await screen.findByLabelText('URL Slug')
    await user.clear(slug)
    await user.type(slug, 'ocupado')
    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('ya está en uso')).toBeInTheDocument()
    expect(slug).toHaveAttribute('aria-invalid', 'true')
    expect(slug).toHaveValue('ocupado')
  })

  it('shows a non-field API error as an alert and keeps the form', async () => {
    mockApi({
      ...mineOne,
      [getLeague]: { body: league() },
      'PATCH /leagues/league-1': apiError(403, 'forbidden', 'No eres administrador de esta liga'),
    })
    const { user } = renderWithProviders(<SettingsPageComponent />)

    await user.click(await screen.findByRole('button', { name: 'Guardar Cambios' }))

    expect((await screen.findAllByText('No eres administrador de esta liga')).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Nombre de la Liga')).toHaveValue('Liga Norte')
  })

  it('uploads the logo as multipart (file, scope, scope_id) and saves the returned URL', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      [getLeague]: { body: league() },
      'POST /storage/objects': { status: 201, body: { key: 'league/league-1/logo.png', url: 'https://cdn.test/logo.png', is_public: true } },
      'PATCH /leagues/league-1': { body: league({ logo: 'https://cdn.test/logo.png' }) },
    })
    const { user } = renderWithProviders(<SettingsPageComponent />)

    const file = new File(['png-bytes'], 'logo.png', { type: 'image/png' })
    await user.upload(await screen.findByLabelText(/cargar logo/i), file)

    expect(await screen.findByText('Liga actualizada correctamente')).toBeInTheDocument()
    const [form] = requestsTo(fetchMock, 'POST /storage/objects') as FormData[]
    expect(form).toBeInstanceOf(FormData)
    expect(form?.get('scope')).toBe('league')
    expect(form?.get('scope_id')).toBe('league-1')
    const sent = form?.get('file')
    expect(sent).toBeInstanceOf(File)
    expect((sent as File).name).toBe('logo.png')
    expect(requestsTo(fetchMock, 'PATCH /leagues/league-1')).toEqual([{ logo: 'https://cdn.test/logo.png' }])
  })

  it('shows the upload error and does not touch the league', async () => {
    const fetchMock = mockApi({
      ...mineOne,
      [getLeague]: { body: league() },
      'POST /storage/objects': apiError(413, 'too_large', 'El archivo es demasiado grande'),
    })
    const { user } = renderWithProviders(<SettingsPageComponent />)

    await user.upload(await screen.findByLabelText(/cargar logo/i), new File(['x'], 'big.png', { type: 'image/png' }))

    expect((await screen.findAllByText('El archivo es demasiado grande')).length).toBeGreaterThan(0)
    expect(requestsTo(fetchMock, 'PATCH /leagues/league-1')).toEqual([])
  })

  it('scopes to the league picked in the selector when there are several', async () => {
    mockApi({
      'GET /leagues/mine': list([league(), league({ id: 'league-2', name: 'Liga Sur', slug: 'liga-sur' })]),
      [getLeague]: { body: league() },
      'GET /leagues/league-2': { body: league({ id: 'league-2', name: 'Liga Sur', slug: 'liga-sur' }) },
    })
    const { user } = renderWithProviders(<SettingsPageComponent />)

    expect(await screen.findByLabelText('Nombre de la Liga')).toHaveValue('Liga Norte')
    await user.click(screen.getByLabelText('Liga'))
    await user.click(await screen.findByRole('option', { name: 'Liga Sur' }))

    expect(await screen.findByDisplayValue('Liga Sur')).toBeInTheDocument()
  })
})
