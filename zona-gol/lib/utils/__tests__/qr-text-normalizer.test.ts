import { describe, it, expect } from 'vitest'
import {
  normalizeForQR,
  normalizeQRData,
  hasProblematicChars,
  getProblematicChars
} from '../qr-text-normalizer'

describe('qr-text-normalizer', () => {
  describe('normalizeForQR', () => {
    it('should return empty string for empty input', () => {
      expect(normalizeForQR('')).toBe('')
    })

    it('should return empty string for null/undefined input', () => {
      expect(normalizeForQR(null as unknown as string)).toBe('')
      expect(normalizeForQR(undefined as unknown as string)).toBe('')
    })

    it('should not modify text without special characters', () => {
      const text = 'Hello World 123'
      expect(normalizeForQR(text)).toBe('Hello World 123')
    })

    it('should normalize Spanish ñ character', () => {
      expect(normalizeForQR('España')).toBe('Espana')
      expect(normalizeForQR('Peña')).toBe('Pena')
      expect(normalizeForQR('Año Nuevo')).toBe('Ano Nuevo')
    })

    it('should normalize uppercase Ñ character', () => {
      expect(normalizeForQR('ESPAÑA')).toBe('ESPANA')
      expect(normalizeForQR('NIÑO')).toBe('NINO')
    })

    it('should normalize accented vowels - lowercase', () => {
      expect(normalizeForQR('café')).toBe('cafe')
      expect(normalizeForQR('José')).toBe('Jose')
      expect(normalizeForQR('María')).toBe('Maria')
      expect(normalizeForQR('menú')).toBe('menu')
      expect(normalizeForQR('árbol')).toBe('arbol')
    })

    it('should normalize accented vowels - uppercase', () => {
      expect(normalizeForQR('MARÍA')).toBe('MARIA')
      expect(normalizeForQR('JOSÉ')).toBe('JOSE')
      expect(normalizeForQR('ÁNGEL')).toBe('ANGEL')
    })

    it('should normalize ç character', () => {
      expect(normalizeForQR('façade')).toBe('facade')
      expect(normalizeForQR('Çevdet')).toBe('Cevdet')
    })

    it('should normalize umlaut characters', () => {
      expect(normalizeForQR('über')).toBe('uber')
      expect(normalizeForQR('Müller')).toBe('Muller')
    })

    it('should handle complex Spanish names', () => {
      expect(normalizeForQR('José García Martínez')).toBe('Jose Garcia Martinez')
      expect(normalizeForQR('María Ángeles Peña')).toBe('Maria Angeles Pena')
      expect(normalizeForQR('Raúl Jiménez Muñoz')).toBe('Raul Jimenez Munoz')
    })

    it('should handle mixed content', () => {
      const input = 'Año 2024 - Torneo de Fútbol'
      const expected = 'Ano 2024 - Torneo de Futbol'
      expect(normalizeForQR(input)).toBe(expected)
    })
  })

  describe('normalizeQRData', () => {
    it('should normalize specified string fields', () => {
      const data = {
        player_name: 'José García',
        team: 'Team A',
        id: 123
      }
      const result = normalizeQRData(data, ['player_name'])
      expect(result.player_name).toBe('Jose Garcia')
      expect(result.team).toBe('Team A') // Not normalized
      expect(result.id).toBe(123)
    })

    it('should normalize default fields', () => {
      const data = {
        player_name: 'María Peña',
        playerName: 'José Ángel',
        name: 'Raúl Muñoz',
        other: 'Café'
      }
      const result = normalizeQRData(data)
      expect(result.player_name).toBe('Maria Pena')
      expect(result.playerName).toBe('Jose Angel')
      expect(result.name).toBe('Raul Munoz')
      expect(result.other).toBe('Café') // Not in default fields
    })

    it('should handle non-string fields gracefully', () => {
      const data = {
        player_name: 'José',
        id: 123,
        active: true,
        scores: [1, 2, 3]
      }
      const result = normalizeQRData(data, ['player_name', 'id' as keyof typeof data])
      expect(result.player_name).toBe('Jose')
      expect(result.id).toBe(123) // Not modified (not a string)
    })

    it('should return a new object (not mutate original)', () => {
      const data = { player_name: 'José' }
      const result = normalizeQRData(data)
      expect(result).not.toBe(data)
      expect(data.player_name).toBe('José') // Original unchanged
    })
  })

  describe('hasProblematicChars', () => {
    it('should return false for text without problematic chars', () => {
      expect(hasProblematicChars('Hello World')).toBe(false)
      expect(hasProblematicChars('Team 123')).toBe(false)
      expect(hasProblematicChars('ABC XYZ')).toBe(false)
    })

    it('should return true for text with accented vowels', () => {
      expect(hasProblematicChars('café')).toBe(true)
      expect(hasProblematicChars('José')).toBe(true)
      expect(hasProblematicChars('María')).toBe(true)
      expect(hasProblematicChars('niño')).toBe(true)
    })

    it('should return true for text with ñ', () => {
      expect(hasProblematicChars('España')).toBe(true)
      expect(hasProblematicChars('NIÑO')).toBe(true)
    })

    it('should return true for text with ç', () => {
      expect(hasProblematicChars('façade')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(hasProblematicChars('JOSÉ')).toBe(true)
      expect(hasProblematicChars('josé')).toBe(true)
    })
  })

  describe('getProblematicChars', () => {
    it('should return empty array for text without problematic chars', () => {
      expect(getProblematicChars('Hello World')).toEqual([])
    })

    it('should return array of unique problematic chars', () => {
      const chars = getProblematicChars('café María')
      expect(chars).toContain('é')
      expect(chars).toContain('í')
      // Regular 'a' is not problematic, should not be in the list
      expect(chars).not.toContain('a')
    })

    it('should not include duplicates', () => {
      const chars = getProblematicChars('María García')
      const iCount = chars.filter(c => c.toLowerCase() === 'í').length
      expect(iCount).toBe(1)
    })

    it('should find all problematic characters in complex text', () => {
      const chars = getProblematicChars('Peña Ñoño café')
      expect(chars).toContain('ñ')
      expect(chars).toContain('Ñ')
      expect(chars).toContain('é')
    })
  })
})
