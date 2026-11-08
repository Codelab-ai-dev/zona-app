import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'

import type { NavItem } from '../area'
import { DashboardLayout, orderTabs } from './dashboard-layout'

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ status: 'authenticated', profile: { id: 'u1', name: 'Ana', role: 'league_admin' }, signIn: vi.fn(), signOut: vi.fn() }),
}))
vi.mock('@/features/leagues/api', () => ({
  useMyLeagues: () => ({ data: { data: [{ id: 'l1', product_mode: 'full' }], page: { limit: 1, offset: 0 } } }),
}))

const nav: NavItem[] = [
  { to: '/liga-admin/tabla', label: 'Tabla', roles: ['league_admin'] },
  { to: '/liga-admin', label: 'Mi liga', roles: ['league_admin'] },
  { to: '/liga-admin/calendario', label: 'Calendario', roles: ['league_admin'] },
  { to: '/otra', label: 'Otra', roles: ['league_admin'] },
  { to: '/admin', label: 'Administración', roles: ['super_admin'] },
]

describe('DashboardLayout', () => {
  it('orders tabs and uses the original labels, keeping unknown routes last', () => {
    expect(orderTabs(nav.slice(0, 4)).map((i) => i.label)).toEqual(['Resumen', 'Calendario', 'Posiciones', 'Otra'])
  })

  it('shows the greeting, role, plan and only the tabs allowed for the role', () => {
    renderWithProviders(<DashboardLayout nav={nav}>contenido</DashboardLayout>, { route: '/liga-admin' })

    expect(screen.getByText('Hola, Ana')).toBeInTheDocument()
    expect(screen.getByText('Administrador de Liga')).toBeInTheDocument()
    expect(screen.getByText(/Zona-G Completo/)).toBeInTheDocument()
    const tabs = screen.getByRole('navigation', { name: 'Panel' })
    expect(within(tabs).getByRole('link', { name: 'Posiciones' })).toHaveAttribute('href', '/liga-admin/tabla')
    expect(within(tabs).queryByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page')
    expect(within(tabs).queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
  })

  it('opens the mobile menu from an accessible button', async () => {
    const { user } = renderWithProviders(<DashboardLayout nav={nav}>contenido</DashboardLayout>, { route: '/liga-admin' })
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    expect(await screen.findByRole('dialog', { name: 'Zona Gol' })).toBeInTheDocument()
  })
})
