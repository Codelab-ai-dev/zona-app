import { QueryClientProvider } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { mockApi, renderWithProviders, requestsTo } from '@/test/render'

import { LeagueFeaturesEditor } from './components/league-features-editor'
import { FEATURE_KEYS, type League } from './types'
import { errorBody, league } from './test-fixtures'

const baseFeatures = {
  manual_entry: true,
  public_portal: true,
  statistics: true,
  qr_codes: false,
  facial_recognition: false,
  mobile_app: false,
  realtime_updates: false,
  finance: false,
  finance_auto_fines: false,
  finance_payments: false,
  ai_agent: false,
}

const plain: League = { ...league, features: baseFeatures }
const withFinance: League = {
  ...league,
  features: { ...baseFeatures, finance: true, finance_auto_fines: true, finance_payments: true },
}

const renderEditor = (l: League | null, onOpenChange: (open: boolean) => void = () => {}) =>
  renderWithProviders(<LeagueFeaturesEditor open onOpenChange={onOpenChange} league={l} />)

describe('LeagueFeaturesEditor', () => {
  it('renders nothing when league is null', () => {
    mockApi({})
    renderEditor(null)
    expect(screen.queryByText('Configurar Features')).not.toBeInTheDocument()
  })

  it('renders the groups and one switch per feature, reflecting the league state', () => {
    mockApi({})
    renderEditor(plain)

    expect(screen.getByText('Configurar Features')).toBeInTheDocument()
    expect(screen.getByText('Liga Premier')).toBeInTheDocument()
    for (const group of ['Funciones Principales', 'Móvil y Tiempo Real', 'Gestión Financiera', 'Inteligencia Artificial']) {
      expect(screen.getByText(group)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('switch')).toHaveLength(FEATURE_KEYS.length)
    expect(screen.getByRole('switch', { name: 'Portal Público' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Códigos QR' })).not.toBeChecked()
  })

  it('disables finance sub-features while finance is off', () => {
    mockApi({})
    renderEditor(plain)

    expect(screen.getByRole('switch', { name: 'Multas Automáticas' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Pagos' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Finanzas' })).toBeEnabled()
  })

  it('enables finance sub-features while finance is on', () => {
    mockApi({})
    renderEditor(withFinance)

    expect(screen.getByRole('switch', { name: 'Multas Automáticas' })).toBeEnabled()
    expect(screen.getByRole('switch', { name: 'Pagos' })).toBeEnabled()
  })

  it('turning finance off disables and clears its sub-features', async () => {
    mockApi({})
    const { user } = renderEditor(withFinance)

    await user.click(screen.getByRole('switch', { name: 'Finanzas' }))

    for (const name of ['Multas Automáticas', 'Pagos']) {
      expect(screen.getByRole('switch', { name: name })).toBeDisabled()
      expect(screen.getByRole('switch', { name: name })).not.toBeChecked()
    }
  })

  it('sends the FULL features object (every flag) with the league product mode and confirms', async () => {
    const onOpenChange = vi.fn()
    const fetchMock = mockApi({ 'PATCH /leagues/league1/product-mode': { body: plain } })
    const { user } = renderEditor(plain, onOpenChange)

    await user.click(screen.getByRole('switch', { name: 'Códigos QR' }))
    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('Features actualizadas exitosamente')).toBeInTheDocument()
    const [body] = requestsTo(fetchMock, 'PATCH /leagues/league1/product-mode') as Array<{
      product_mode: string
      features: Record<string, boolean>
    }>
    expect(body).toEqual({ product_mode: 'full', features: { ...baseFeatures, qr_codes: true } })
    expect(Object.keys(body!.features).sort()).toEqual([...FEATURE_KEYS].sort())
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('sends every flag as an explicit boolean even when the league has no features yet', async () => {
    const fetchMock = mockApi({ 'PATCH /leagues/league1/product-mode': { body: league } })
    const { user } = renderEditor(league)

    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    await screen.findByText('Features actualizadas exitosamente')
    const [body] = requestsTo(fetchMock, 'PATCH /leagues/league1/product-mode') as Array<{ features: Record<string, boolean> }>
    expect(Object.values(body!.features)).toEqual(FEATURE_KEYS.map(() => false))
  })

  it('shows the API error and keeps the dialog open when saving fails', async () => {
    const onOpenChange = vi.fn()
    mockApi({ 'PATCH /leagues/league1/product-mode': { status: 403, body: errorBody('forbidden', 'No tienes permiso') } })
    const { user } = renderEditor(plain, onOpenChange)

    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('closes without saving on cancel', async () => {
    const onOpenChange = vi.fn()
    const fetchMock = mockApi({})
    const { user } = renderEditor(plain, onOpenChange)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('hides the dialog when open becomes false', () => {
    mockApi({})
    const { rerender, client } = renderEditor(plain)
    expect(screen.getByText('Configurar Features')).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LeagueFeaturesEditor open={false} onOpenChange={() => {}} league={plain} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.queryByText('Configurar Features')).not.toBeInTheDocument()
  })
})
