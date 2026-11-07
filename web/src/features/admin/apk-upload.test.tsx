import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { AppReleases } from './components/app-releases'
import { errorBody, emptyPage, league, pageOf } from './test-fixtures'

// The component validates by file name/size itself; do not let userEvent
// pre-filter by the input's `accept` so the validation is what is tested.
const uploader = userEvent.setup({ applyAccept: false })

function setup(postResponse: { status?: number; body?: unknown } = { status: 201, body: { key: 'app_releases/league1/x.apk' } }) {
  const fetchMock = mockApi({
    'GET /leagues/admin': { body: pageOf([league]) },
    'GET /storage/objects': { body: emptyPage },
    'POST /storage/objects': postResponse,
  })
  return { fetchMock, ...renderWithProviders(<AppReleases />) }
}

async function selectLeague(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('combobox', { name: /seleccionar liga/i }))
  await user.click(await screen.findByRole('option', { name: 'Liga Premier' }))
}

const apkInput = () => screen.getByLabelText(/seleccionar apk/i)

describe('APK upload', () => {
  it('shows the file input only after picking a league', async () => {
    const { user } = setup()
    await screen.findByText('Subir APK')
    expect(screen.queryByLabelText(/seleccionar apk/i)).not.toBeInTheDocument()

    await selectLeague(user)
    expect(apkInput()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir APK' })).toBeDisabled()
  })

  it('rejects non-.apk files before any request', async () => {
    const { fetchMock, user } = setup()
    await selectLeague(user)
    await uploader.upload(apkInput(), new File(['x'], 'document.pdf', { type: 'application/pdf' }))

    expect(await screen.findByText('Solo se permiten archivos APK')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir APK' })).toBeDisabled()
    expect(requestsTo(fetchMock, 'POST /storage/objects')).toHaveLength(0)
  })

  it('rejects files larger than 150 MB before any request', async () => {
    const { fetchMock, user } = setup()
    await selectLeague(user)
    const big = new File(['x'], 'big.apk')
    Object.defineProperty(big, 'size', { value: 150 * 1024 * 1024 + 1 })
    await uploader.upload(apkInput(), big)

    expect(await screen.findByText('El archivo es demasiado grande (máximo 150MB)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir APK' })).toBeDisabled()
    expect(requestsTo(fetchMock, 'POST /storage/objects')).toHaveLength(0)
  })

  it('uploads a valid .apk as multipart with scope app_releases and scope_id, then refreshes the list', async () => {
    const { fetchMock, user } = setup()
    await selectLeague(user)
    await uploader.upload(apkInput(), new File(['apk-bytes'], 'app-1.0.apk'))

    expect(await screen.findByText('app-1.0.apk')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Subir APK' }))

    expect(await screen.findByText('APK subido exitosamente')).toBeInTheDocument()
    const [body] = requestsTo(fetchMock, 'POST /storage/objects') as FormData[]
    expect(body).toBeInstanceOf(FormData)
    expect(body!.get('scope')).toBe('app_releases')
    expect(body!.get('scope_id')).toBe('league1')
    expect((body!.get('file') as File).name).toBe('app-1.0.apk')
    expect(requestsTo(fetchMock, 'GET /storage/objects').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('app-1.0.apk')).not.toBeInTheDocument()
  })

  it('shows the API error message when the upload fails', async () => {
    const { user } = setup({ status: 413, body: errorBody('too_large', 'El archivo es demasiado grande') })
    await selectLeague(user)
    await uploader.upload(apkInput(), new File(['x'], 'app.apk'))
    await user.click(screen.getByRole('button', { name: 'Subir APK' }))

    expect(await screen.findByText('El archivo es demasiado grande')).toBeInTheDocument()
  })
})
