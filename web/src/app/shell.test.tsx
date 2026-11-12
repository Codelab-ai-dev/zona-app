import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'

import { DocumentTitle } from './document-title'
import { RouteError } from './route-error'

function Boom(): never {
  throw new Error('kaput')
}

describe('app shell', () => {
  it('shows a friendly error screen when a page crashes', () => {
    const router = createMemoryRouter([{ path: '/', element: <Boom />, errorElement: <RouteError /> }])
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('sets the page title from the route', () => {
    const router = createMemoryRouter([{ path: '*', element: <DocumentTitle /> }], { initialEntries: ['/play/clips'] })
    render(<RouterProvider router={router} />)
    expect(document.title).toBe('Zona Play - Revive cada jugada · Zona Gol')
  })
})
