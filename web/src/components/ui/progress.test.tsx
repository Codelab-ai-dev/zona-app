import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'

import { Progress } from './progress'

it('exposes its value to assistive technology', () => {
  render(<Progress value={40} aria-label="Subida" />)
  const bar = screen.getByRole('progressbar', { name: 'Subida' })
  expect(bar).toHaveAttribute('aria-valuenow', '40')
})
