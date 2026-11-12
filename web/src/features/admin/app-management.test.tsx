import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { AppManagement } from './components/app-management'
import { emptyPage, errorBody, league, pageOf } from './test-fixtures'

describe('AppManagement', () => {
  it('shows the loading state first', () => {
    mockApi({ 'GET /leagues/admin': { body: emptyPage } })
    renderWithProviders(<AppManagement />)
    expect(screen.getByText('Cargando ligas…')).toBeInTheDocument()
  })

  it('renders the title and the upload card once leagues load', async () => {
    mockApi({ 'GET /leagues/admin': { body: pageOf([league]) } })
    renderWithProviders(<AppManagement />)

    expect(screen.getByText('Gestión de Aplicación Móvil')).toBeInTheDocument()
    expect(await screen.findByText('Subir APK')).toBeInTheDocument()
  })

  it('renders the empty state when there are no leagues', async () => {
    mockApi({ 'GET /leagues/admin': { body: emptyPage } })
    renderWithProviders(<AppManagement />)
    expect(await screen.findByText('No hay información para mostrar')).toBeInTheDocument()
  })

  it('renders the API error when leagues fail', async () => {
    mockApi({ 'GET /leagues/admin': { status: 500, body: errorBody('internal', 'Error del servidor') } })
    renderWithProviders(<AppManagement />)
    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
  })

  it('uploads the APK with scope app_releases and the league as scope_id', async () => {
    const fetchMock = mockApi({
      'GET /leagues/admin': { body: pageOf([league]) },
      'POST /storage/objects': { status: 201, body: { key: 'app_releases/league1/a.apk' } },
    })
    const { user } = renderWithProviders(<AppManagement />)

    await user.click(await screen.findByRole('combobox', { name: /seleccionar liga/i }))
    await user.click(await screen.findByRole('option', { name: 'Liga Premier' }))
    await userEvent.setup({ applyAccept: false }).upload(screen.getByLabelText(/seleccionar apk/i), new File(['x'], 'app.apk'))
    await user.click(screen.getByRole('button', { name: 'Subir APK' }))

    expect(await screen.findByText('APK subido exitosamente')).toBeInTheDocument()
    const [body] = requestsTo(fetchMock, 'POST /storage/objects') as FormData[]
    expect(body!.get('scope')).toBe('app_releases')
    expect(body!.get('scope_id')).toBe('league1')
  })
})
