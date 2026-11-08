import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'

import type { NavItem } from '../area'
import { DashboardLayout } from './dashboard-layout'
import { gateTabs, orderTabs } from './dashboard-nav'
import type { LeagueCapabilities } from './league-capabilities'

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ status: 'authenticated', profile: { id: 'u1', name: 'Ana', role: 'league_admin' }, signIn: vi.fn(), signOut: vi.fn() }),
}))

const caps: { current: LeagueCapabilities } = { current: makeCaps([], []) }
vi.mock('./league-capabilities', () => ({ useLeagueCapabilities: () => caps.current }))

function makeCaps(features: string[], formats: string[], mode: 'full' | 'web_only' = 'full'): LeagueCapabilities {
  return {
    leagues: [{ id: 'l1', name: 'Liga', product_mode: mode } as LeagueCapabilities['leagues'][number]],
    has: (f) => features.includes(f),
    formats: new Set(formats),
    loading: false,
  }
}

const item = (to: string, label = to): NavItem => ({ to, label, roles: ['league_admin'] })
const nav: NavItem[] = [
  item('/liga-admin/tabla', 'Tabla'),
  item('/liga-admin', 'Mi liga'),
  item('/liga-admin/calendario', 'Calendario'),
  item('/liga-admin/finanzas', 'Finanzas'),
  item('/liga-admin/qr-batch', 'QR'),
  item('/liga-admin/grupos', 'Grupos'),
  { to: '/admin', label: 'Administración', roles: ['super_admin'] },
]

describe('dashboard navigation', () => {
  beforeEach(() => {
    caps.current = makeCaps([], ['league'])
  })

  it('orders tabs with the original labels, keeping unknown routes last', () => {
    expect(orderTabs([item('/liga-admin/tabla'), item('/liga-admin'), item('/otra', 'Otra')]).map((i) => i.label)).toEqual([
      'Resumen',
      'Posiciones',
      'Otra',
    ])
  })

  it('hides tabs the leagues cannot use, like the original', () => {
    const labels = (c: LeagueCapabilities) => gateTabs(orderTabs(nav.slice(0, 6)), c).map((i) => i.label)
    expect(labels(makeCaps([], ['league']))).toEqual(['Resumen', 'Calendario', 'Posiciones'])
    expect(labels(makeCaps(['finance', 'qr_codes'], ['group_knockout']))).toEqual([
      'Resumen',
      'Grupos',
      'Calendario',
      'Posiciones',
      'Gestión QR',
      'Finanzas',
    ])
  })

  it('shows greeting, role, plan and only the tabs allowed', () => {
    renderWithProviders(<DashboardLayout nav={nav}>contenido</DashboardLayout>, { route: '/liga-admin' })

    expect(screen.getByText('Hola, Ana')).toBeInTheDocument()
    expect(screen.getByText('Administrador de Liga')).toBeInTheDocument()
    expect(screen.getByText(/Zona-G Completo/)).toBeInTheDocument()
    const tabs = screen.getByRole('navigation', { name: 'Panel' })
    expect(within(tabs).getByRole('link', { name: 'Posiciones' })).toHaveAttribute('href', '/liga-admin/tabla')
    expect(within(tabs).getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page')
    expect(within(tabs).queryByRole('link', { name: 'Finanzas' })).not.toBeInTheDocument()
    expect(within(tabs).queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
  })

  it('offers the app download only when the league has the mobile app', () => {
    const { unmount } = renderWithProviders(<DashboardLayout nav={nav}>x</DashboardLayout>, { route: '/liga-admin' })
    expect(screen.queryByRole('button', { name: 'App Móvil' })).not.toBeInTheDocument()
    unmount()

    caps.current = makeCaps(['mobile_app'], ['league'])
    renderWithProviders(<DashboardLayout nav={nav}>x</DashboardLayout>, { route: '/liga-admin' })
    expect(screen.getByRole('button', { name: 'App Móvil' })).toBeInTheDocument()
  })

  it('opens the mobile menu from an accessible button', async () => {
    const { user } = renderWithProviders(<DashboardLayout nav={nav}>contenido</DashboardLayout>, { route: '/liga-admin' })
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    expect(await screen.findByRole('dialog', { name: 'Zona Gol' })).toBeInTheDocument()
  })
})
