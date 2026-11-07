import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'

import type { NavItem } from '../area'
import { DashboardLayout, groupNav } from './dashboard-layout'

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ status: 'authenticated', profile: { id: 'u1', name: 'Ana', role: 'league_admin' }, signIn: vi.fn(), signOut: vi.fn() }),
}))

const nav: NavItem[] = [
  { to: '/liga-admin', label: 'Mi liga', roles: ['league_admin'] },
  { to: '/liga-admin/calendario', label: 'Calendario', roles: ['league_admin'] },
  { to: '/liga-admin/equipos', label: 'Equipos', roles: ['league_admin'] },
  { to: '/play/admin', label: 'Zona Play', roles: ['league_admin', 'super_admin'] },
  { to: '/admin', label: 'Administración', roles: ['super_admin'] },
]

describe('DashboardLayout navigation', () => {
  it('groups entries into sections and keeps unknown routes', () => {
    const groups = groupNav([...nav, { to: '/otra', label: 'Otra', roles: ['league_admin'] }])
    expect(groups.map((g) => g.title)).toEqual(['General', 'Competición', 'Equipos y jugadores', 'Contenido', 'Otros'])
  })

  it('shows only the entries allowed for the role, grouped', () => {
    renderWithProviders(<DashboardLayout nav={nav}>contenido</DashboardLayout>, { route: '/liga-admin' })

    const side = screen.getAllByRole('navigation', { name: 'Panel' })[0]!
    expect(within(side).getByRole('link', { name: 'Calendario' })).toHaveAttribute('href', '/liga-admin/calendario')
    expect(within(side).queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
    expect(within(side).getByRole('heading', { name: 'Competición' })).toBeInTheDocument()
  })

  it('opens the mobile menu from an accessible button', async () => {
    const { user } = renderWithProviders(<DashboardLayout nav={nav}>contenido</DashboardLayout>, { route: '/liga-admin' })

    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    expect(await screen.findByRole('dialog', { name: 'Menú' })).toBeInTheDocument()
  })
})
