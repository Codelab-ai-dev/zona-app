import { describe, it, expect } from 'vitest'
import { cn, generatePassword } from '../utils'

describe('utils', () => {
  describe('cn (classname merge utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('px-4', 'py-2', 'bg-blue-500')
      expect(result).toBe('px-4 py-2 bg-blue-500')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class active-class')
    })

    it('should handle false conditional classes', () => {
      const isActive = false
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class')
    })

    it('should merge conflicting tailwind classes (last wins)', () => {
      const result = cn('bg-red-500', 'bg-blue-500')
      expect(result).toBe('bg-blue-500')
    })

    it('should handle undefined values', () => {
      const result = cn('base-class', undefined, 'another-class')
      expect(result).toBe('base-class another-class')
    })

    it('should handle empty strings', () => {
      const result = cn('base-class', '', 'another-class')
      expect(result).toBe('base-class another-class')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['px-4', 'py-2'], 'bg-blue-500')
      expect(result).toBe('px-4 py-2 bg-blue-500')
    })

    it('should handle object notation', () => {
      const result = cn({
        'bg-blue-500': true,
        'text-white': true,
        'hidden': false
      })
      expect(result).toBe('bg-blue-500 text-white')
    })
  })

  describe('generatePassword', () => {
    it('should generate password with default length of 8', () => {
      const password = generatePassword()
      expect(password).toHaveLength(8)
    })

    it('should generate password with custom length', () => {
      const password = generatePassword(12)
      expect(password).toHaveLength(12)
    })

    it('should generate password with specified length', () => {
      const password = generatePassword(16)
      expect(password).toHaveLength(16)
    })

    it('should only contain valid characters', () => {
      const password = generatePassword(100)
      const validChars = /^[a-zA-Z0-9!@#$%^&*]+$/
      expect(password).toMatch(validChars)
    })

    it('should generate unique passwords', () => {
      const passwords = new Set<string>()
      for (let i = 0; i < 100; i++) {
        passwords.add(generatePassword(12))
      }
      // With high probability, all passwords should be unique
      expect(passwords.size).toBeGreaterThan(90)
    })
  })
})
