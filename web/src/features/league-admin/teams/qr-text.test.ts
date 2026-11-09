import { describe, expect, it } from 'vitest'

import { hasProblematicChars, normalizeForQR } from './qr-text'

describe('qr-text', () => {
  it('removes accents and eñes keeping case', () => {
    expect(normalizeForQR('María Ñandú Güemes Çelik')).toBe('Maria Nandu Guemes Celik')
    expect(normalizeForQR('JOSÉ MUÑOZ')).toBe('JOSE MUNOZ')
    expect(normalizeForQR('Juan Perez')).toBe('Juan Perez')
  })

  it('detects names that need normalizing', () => {
    expect(hasProblematicChars('Sebastián')).toBe(true)
    expect(hasProblematicChars('Sebastian')).toBe(false)
  })
})
