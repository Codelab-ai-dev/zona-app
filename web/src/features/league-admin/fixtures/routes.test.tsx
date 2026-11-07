import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders } from '@/test/render'

import { area } from './routes'

const page = { limit: 100, offset: 0 }
const league = (id: string, name: string) => ({ id, name, slug: id, is_active: true })

function renderFixtures() {
  const el = area.dashboardRoutes?.routes[0]?.element
  if (!el) throw new Error('missing route')
  return renderWithProviders(<>{el}</>)
}

describe('fixtures routes league selection', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('works when localStorage throws (selection is not persisted)', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [league('l1', 'Liga Uno'), league('l2', 'Liga Dos')], page } },
      'GET /leagues/l2/tournaments': { body: { data: [], page } },
      'GET /teams': { body: { data: [], page } },
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { user } = renderFixtures()
    await user.click(await screen.findByRole('button', { name: /Liga Dos/ }))
    expect(await screen.findByRole('heading', { name: 'Generador de Fixtures' }, { timeout: 4000 })).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('skips the picker with a single league', async () => {
    mockApi({
      'GET /leagues/mine': { body: { data: [league('l1', 'Liga Uno')], page } },
      'GET /leagues/l1/tournaments': { body: { data: [], page } },
      'GET /teams': { body: { data: [], page } },
    })
    renderFixtures()
    expect(await screen.findByRole('heading', { name: 'Generador de Fixtures' }, { timeout: 4000 })).toBeInTheDocument()
  })

  it('shows an empty state when the user administers no league', async () => {
    mockApi({ 'GET /leagues/mine': { body: { data: [], page } } })
    renderFixtures()
    expect(await screen.findByText('Sin ligas')).toBeInTheDocument()
  })
})
