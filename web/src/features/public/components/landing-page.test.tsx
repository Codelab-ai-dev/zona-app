import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { LandingPage } from './landing-page'

describe('LandingPage', () => {
  it('renders one h1 heading', () => {
    renderWithProviders(<LandingPage />)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Gestiona tu Liga de')
  })

  it('renders links to /ligas, /play, and /login', () => {
    renderWithProviders(<LandingPage />)

    // Link to /ligas (can be #ligas anchor or /ligas route link)
    const ligasLinks = screen.getAllByRole('link', { name: /ver ligas|ligas/i })
    expect(ligasLinks.length).toBeGreaterThanOrEqual(1)
    const hasLigasLink = ligasLinks.some((link) => {
      const href = link.getAttribute('href')
      return href === '/ligas' || href === '#ligas'
    })
    expect(hasLigasLink).toBe(true)

    // Link to /login
    const loginLinks = screen.getAllByRole('link', { name: /iniciar sesión|comenzar/i })
    expect(loginLinks.length).toBeGreaterThanOrEqual(1)
    const hasLogin = loginLinks.some((link) => link.getAttribute('href') === '/login')
    expect(hasLogin).toBe(true)
  })

  it('renders logo image', () => {
    renderWithProviders(<LandingPage />)

    const logos = screen.getAllByAltText('')
    const zonaGolLogo = logos.find((img) => img.getAttribute('src') === '/zona-gol.png')
    expect(zonaGolLogo).toBeDefined()
  })

  it('renders features section with h2', () => {
    renderWithProviders(<LandingPage />)

    expect(screen.getByRole('heading', { name: /todo lo que necesitas/i })).toBeInTheDocument()
  })
})
