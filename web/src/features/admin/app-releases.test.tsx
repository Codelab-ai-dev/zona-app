import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { AppReleases } from './components/app-releases'
import { emptyPage, errorBody, inactiveLeague, league, pageOf } from './test-fixtures'

const release = {
  key: 'app_releases/league1/aaa.apk',
  size: 50 * 1024 * 1024,
  content_type: 'application/zip',
  created_at: '2024-01-01T12:00:00Z',
}
const release2 = { ...release, key: 'app_releases/league1/bbb.apk', size: 1024 }

function setup(extra: Record<string, { status?: number; body?: unknown }> = {}, releases = [release, release2]) {
  const fetchMock = mockApi({
    'GET /leagues/admin': { body: pageOf([league, inactiveLeague]) },
    'GET /storage/objects': { body: pageOf(releases) },
    ...extra,
  })
  return { fetchMock, ...renderWithProviders(<AppReleases />) }
}

async function selectLeague(user: ReturnType<typeof renderWithProviders>['user'], name = 'Liga Premier') {
  await user.click(await screen.findByRole('combobox', { name: /seleccionar liga/i }))
  await user.click(await screen.findByRole('option', { name }))
}

afterEach(() => vi.restoreAllMocks())

describe('AppReleases', () => {
  it('lists every league, inactive ones included, from GET /leagues/admin', async () => {
    const { fetchMock, user } = setup()
    await user.click(await screen.findByRole('combobox', { name: /seleccionar liga/i }))

    expect(await screen.findByRole('option', { name: 'Liga Premier' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Liga Ascenso' })).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /leagues/admin')).toHaveLength(1)
  })

  it('shows the empty state when there are no leagues', async () => {
    mockApi({ 'GET /leagues/admin': { body: emptyPage } })
    renderWithProviders(<AppReleases />)
    expect(await screen.findByText('No hay información para mostrar')).toBeInTheDocument()
  })

  it('shows the API error when leagues fail to load', async () => {
    mockApi({ 'GET /leagues/admin': { status: 500, body: errorBody('internal', 'Error del servidor') } })
    renderWithProviders(<AppReleases />)
    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
  })

  it('requests the releases of the selected league and renders name, size and date', async () => {
    const { fetchMock, user } = setup()
    await selectLeague(user)

    expect(await screen.findByText('aaa.apk')).toBeInTheDocument()
    expect(screen.getByText('bbb.apk')).toBeInTheDocument()
    expect(screen.getByText('50 MB')).toBeInTheDocument()
    expect(screen.getByText('1 KB')).toBeInTheDocument()
    expect(screen.getAllByText(/2024/).length).toBeGreaterThan(0)
    const call = fetchMock.mock.calls.map(([input]) => new URL(String(input), 'http://localhost')).find((u) => u.pathname.endsWith('/storage/objects'))
    expect(call?.searchParams.get('scope')).toBe('app_releases')
    expect(call?.searchParams.get('scope_id')).toBe('league1')
  })

  it('shows the empty state when the league has no releases', async () => {
    const { user } = setup({}, [])
    await selectLeague(user)
    expect(await screen.findByText('No hay versiones disponibles para esta liga')).toBeInTheDocument()
  })

  it('shows the API error when releases fail to load', async () => {
    const { user } = setup({ 'GET /storage/objects': { status: 403, body: errorBody('forbidden', 'No tienes permiso') } })
    await selectLeague(user)
    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
  })

  it('downloads through GET /storage/url?key=...', async () => {
    const hrefs: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      hrefs.push(this.href)
    })
    const { fetchMock, user } = setup({ 'GET /storage/url': { body: { url: 'https://cdn.example.com/aaa.apk' } } })
    await selectLeague(user)
    await user.click(await screen.findByRole('button', { name: 'Descargar aaa.apk' }))

    expect(await screen.findByText('Descarga iniciada')).toBeInTheDocument()
    const urlCall = fetchMock.mock.calls.map(([input]) => new URL(String(input), 'http://localhost')).find((u) => u.pathname.endsWith('/storage/url'))
    expect(urlCall?.searchParams.get('key')).toBe('app_releases/league1/aaa.apk')
    expect(hrefs).toEqual(['https://cdn.example.com/aaa.apk'])
  })

  it('shows an error toast when the download link cannot be fetched', async () => {
    const { user } = setup({ 'GET /storage/url': { status: 404, body: errorBody('not_found', 'No encontrado') } })
    await selectLeague(user)
    await user.click(await screen.findByRole('button', { name: 'Descargar aaa.apk' }))
    expect(await screen.findByText('No encontrado')).toBeInTheDocument()
  })
})

describe('AppReleases delete', () => {
  it('asks for confirmation naming the file before sending anything', async () => {
    const { fetchMock, user } = setup({ 'DELETE /storage/objects': { status: 204 } })
    await selectLeague(user)
    await user.click(await screen.findByRole('button', { name: 'Eliminar aaa.apk' }))

    const dialog = await screen.findByRole('alertdialog', { name: 'Eliminar APK' })
    expect(dialog).toHaveTextContent('aaa.apk')
    expect(requestsTo(fetchMock, 'DELETE /storage/objects')).toHaveLength(0)
  })

  it('sends DELETE /storage/objects {key} after confirming and refreshes the list', async () => {
    const { fetchMock, user } = setup({ 'DELETE /storage/objects': { status: 204 } })
    await selectLeague(user)
    await user.click(await screen.findByRole('button', { name: 'Eliminar aaa.apk' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('APK eliminado exitosamente')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /storage/objects')).toEqual([{ key: 'app_releases/league1/aaa.apk' }])
    expect(requestsTo(fetchMock, 'GET /storage/objects').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('does not delete when cancelled', async () => {
    const { fetchMock, user } = setup({ 'DELETE /storage/objects': { status: 204 } })
    await selectLeague(user)
    await user.click(await screen.findByRole('button', { name: 'Eliminar aaa.apk' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE /storage/objects')).toHaveLength(0)
  })

  it('shows the API error when deletion fails', async () => {
    const { user } = setup({ 'DELETE /storage/objects': { status: 403, body: errorBody('forbidden', 'No tienes permiso') } })
    await selectLeague(user)
    await user.click(await screen.findByRole('button', { name: 'Eliminar aaa.apk' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
  })
})
