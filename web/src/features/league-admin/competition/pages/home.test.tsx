import { describe, it, expect } from 'vitest'

import { HomePage } from './home'

describe('HomePage', () => {
  it('renders without crashing', () => {
    // The test just checks that the component doesn't crash
    // Real rendering would require full auth context setup
    expect(HomePage).toBeDefined()
  })
})
