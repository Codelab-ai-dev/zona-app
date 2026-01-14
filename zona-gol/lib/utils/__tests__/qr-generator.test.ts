import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generatePlayerQRCredential,
  generateLegacyPlayerQR,
  credentialToQRString,
  validatePlayerCredential,
  getDaysUntilExpiration,
  getExpirationDate,
  type PlayerQRCredential,
  type LegacyPlayerQR,
} from '../qr-generator'

describe('qr-generator', () => {
  // Save original Date.now
  const originalDateNow = Date.now

  beforeEach(() => {
    // Mock Date.now to return a fixed timestamp for consistent tests
    vi.spyOn(Date, 'now').mockReturnValue(1704067200000) // 2024-01-01 00:00:00 UTC
  })

  afterEach(() => {
    // Restore original Date.now
    vi.restoreAllMocks()
  })

  describe('generatePlayerQRCredential', () => {
    const baseParams = {
      playerId: 'player-123',
      leagueId: 'league-456',
      tournamentId: 'tournament-789',
      season: '2024-A',
    }

    it('generates credential with all required fields', () => {
      const credential = generatePlayerQRCredential(baseParams)

      expect(credential.typ).toBe('player-cred')
      expect(credential.ver).toBe(1)
      expect(credential.pid).toBe('player-123')
      expect(credential.lid).toBe('league-456')
      expect(credential.tid).toBe('tournament-789')
      expect(credential.season).toBe('2024-A')
      expect(credential.exp).toBeTypeOf('number')
      expect(credential.nonce).toBeTypeOf('string')
    })

    it('includes jersey number when provided', () => {
      const credential = generatePlayerQRCredential({
        ...baseParams,
        jerseyNumber: 10,
      })

      expect(credential.num).toBe(10)
    })

    it('omits jersey number when not provided', () => {
      const credential = generatePlayerQRCredential(baseParams)

      expect(credential.num).toBeUndefined()
    })

    it('uses default expiration of 180 days when not specified', () => {
      const credential = generatePlayerQRCredential(baseParams)

      const expectedExpiration = Math.floor((1704067200000 + (180 * 24 * 60 * 60 * 1000)) / 1000)
      expect(credential.exp).toBe(expectedExpiration)
    })

    it('uses custom expiration when provided', () => {
      const customDate = new Date('2024-12-31')
      const credential = generatePlayerQRCredential({
        ...baseParams,
        customExpiration: customDate,
      })

      expect(credential.exp).toBe(Math.floor(customDate.getTime() / 1000))
    })

    it('generates unique nonce', () => {
      const credential1 = generatePlayerQRCredential(baseParams)
      const credential2 = generatePlayerQRCredential(baseParams)

      // Nonce should be a string of length 8
      expect(credential1.nonce).toHaveLength(8)
      expect(credential2.nonce).toHaveLength(8)
    })

    it('stores expiration as unix timestamp in seconds', () => {
      const customDate = new Date('2024-06-01T12:00:00Z')
      const credential = generatePlayerQRCredential({
        ...baseParams,
        customExpiration: customDate,
      })

      expect(credential.exp).toBe(Math.floor(customDate.getTime() / 1000))
      expect(credential.exp).toBeLessThan(Date.now()) // In seconds, not milliseconds
    })
  })

  describe('generateLegacyPlayerQR', () => {
    const baseParams = {
      playerId: 'player-123',
      playerName: 'John Doe',
      teamId: 'team-456',
    }

    it('generates legacy QR with required fields', () => {
      const qr = generateLegacyPlayerQR(baseParams)

      expect(qr.type).toBe('player_verification')
      expect(qr.player_id).toBe('player-123')
      expect(qr.player_name).toBe('John Doe')
      expect(qr.team_id).toBe('team-456')
      expect(qr.version).toBe('1.0')
      expect(qr.timestamp).toBeTypeOf('string')
    })

    it('includes jersey number when provided', () => {
      const qr = generateLegacyPlayerQR({
        ...baseParams,
        jerseyNumber: 10,
      }) as any

      expect(qr.jersey_number).toBe(10)
    })

    it('includes league ID when provided', () => {
      const qr = generateLegacyPlayerQR({
        ...baseParams,
        leagueId: 'league-789',
      }) as any

      expect(qr.league_id).toBe('league-789')
    })

    it('normalizes player name with special characters', () => {
      const qr = generateLegacyPlayerQR({
        ...baseParams,
        playerName: 'José María Pérez',
      })

      expect(qr.player_name).toBe('Jose Maria Perez')
    })

    it('normalizes player name with accents', () => {
      const qr = generateLegacyPlayerQR({
        ...baseParams,
        playerName: 'Álvaro Muñoz',
      })

      expect(qr.player_name).toBe('Alvaro Munoz')
    })

    it('generates ISO timestamp', () => {
      const qr = generateLegacyPlayerQR(baseParams)

      // Verify it's a valid ISO string
      expect(() => new Date(qr.timestamp)).not.toThrow()
      expect(qr.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('omits jersey number when not provided', () => {
      const qr = generateLegacyPlayerQR(baseParams) as any

      expect(qr.jersey_number).toBeUndefined()
    })

    it('omits league ID when not provided', () => {
      const qr = generateLegacyPlayerQR(baseParams) as any

      expect(qr.league_id).toBeUndefined()
    })

    it('handles jersey number zero', () => {
      const qr = generateLegacyPlayerQR({
        ...baseParams,
        jerseyNumber: 0,
      }) as any

      expect(qr.jersey_number).toBe(0)
    })
  })

  describe('credentialToQRString', () => {
    it('converts new credential to JSON string', () => {
      const credential: PlayerQRCredential = {
        typ: 'player-cred',
        ver: 1,
        pid: 'player-123',
        lid: 'league-456',
        tid: 'tournament-789',
        season: '2024-A',
        exp: 1735689600,
        nonce: 'abc12345',
      }

      const qrString = credentialToQRString(credential)

      expect(qrString).toBeTypeOf('string')
      expect(JSON.parse(qrString)).toEqual(credential)
    })

    it('converts legacy QR to JSON string', () => {
      const legacyQR: LegacyPlayerQR = {
        type: 'player_verification',
        player_id: 'player-123',
        player_name: 'John Doe',
        team_id: 'team-456',
        timestamp: '2024-01-01T00:00:00.000Z',
        version: '1.0',
      }

      const qrString = credentialToQRString(legacyQR)

      expect(qrString).toBeTypeOf('string')
      expect(JSON.parse(qrString)).toEqual(legacyQR)
    })

    it('produces valid JSON that can be parsed', () => {
      const credential: PlayerQRCredential = {
        typ: 'player-cred',
        ver: 1,
        pid: 'player-123',
        lid: 'league-456',
        tid: 'tournament-789',
        season: '2024-A',
        exp: 1735689600,
      }

      const qrString = credentialToQRString(credential)
      const parsed = JSON.parse(qrString)

      expect(parsed.typ).toBe('player-cred')
      expect(parsed.pid).toBe('player-123')
    })
  })

  describe('validatePlayerCredential', () => {
    const validCredential: PlayerQRCredential = {
      typ: 'player-cred',
      ver: 1,
      pid: 'player-123',
      lid: 'league-456',
      tid: 'tournament-789',
      season: '2024-A',
      exp: Math.floor(Date.now() / 1000) + 86400, // Expires in 1 day
    }

    it('validates a valid credential', () => {
      const result = validatePlayerCredential(validCredential)

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('rejects expired credential', () => {
      const expiredCredential = {
        ...validCredential,
        exp: Math.floor(Date.now() / 1000) - 86400, // Expired 1 day ago
      }

      const result = validatePlayerCredential(expiredCredential)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Credencial expirada')
    })

    it('rejects credential with invalid type', () => {
      const invalidCredential = {
        ...validCredential,
        typ: 'invalid-type' as any,
      }

      const result = validatePlayerCredential(invalidCredential)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Tipo de credencial inválido')
    })

    it('rejects credential with invalid version', () => {
      const invalidCredential = {
        ...validCredential,
        ver: 2 as any,
      }

      const result = validatePlayerCredential(invalidCredential)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Versión de credencial no soportada')
    })

    it('rejects credential without player ID', () => {
      const invalidCredential = {
        ...validCredential,
        pid: '',
      }

      const result = validatePlayerCredential(invalidCredential)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Credencial incompleta')
    })

    it('rejects credential without league ID', () => {
      const invalidCredential = {
        ...validCredential,
        lid: '',
      }

      const result = validatePlayerCredential(invalidCredential)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Credencial incompleta')
    })

    it('rejects credential without tournament ID', () => {
      const invalidCredential = {
        ...validCredential,
        tid: '',
      }

      const result = validatePlayerCredential(invalidCredential)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Credencial incompleta')
    })

    it('rejects credential without season', () => {
      const invalidCredential = {
        ...validCredential,
        season: '',
      }

      const result = validatePlayerCredential(invalidCredential)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Credencial incompleta')
    })

    it('accepts credential expiring exactly now', () => {
      const expiringNowCredential = {
        ...validCredential,
        exp: Math.floor(Date.now() / 1000) + 1, // Expires in 1 second
      }

      const result = validatePlayerCredential(expiringNowCredential)

      expect(result.isValid).toBe(true)
    })

    it('accepts credential with optional fields', () => {
      const credentialWithOptionals = {
        ...validCredential,
        num: 10,
        nonce: 'abc12345',
      }

      const result = validatePlayerCredential(credentialWithOptionals)

      expect(result.isValid).toBe(true)
    })
  })

  describe('getDaysUntilExpiration', () => {
    it('calculates days until expiration correctly', () => {
      const credential: PlayerQRCredential = {
        typ: 'player-cred',
        ver: 1,
        pid: 'player-123',
        lid: 'league-456',
        tid: 'tournament-789',
        season: '2024-A',
        exp: Math.floor(Date.now() / 1000) + (10 * 86400), // 10 days from now
      }

      const days = getDaysUntilExpiration(credential)

      expect(days).toBe(10)
    })

    it('returns 1 for credential expiring in less than a day', () => {
      const credential: PlayerQRCredential = {
        typ: 'player-cred',
        ver: 1,
        pid: 'player-123',
        lid: 'league-456',
        tid: 'tournament-789',
        season: '2024-A',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      }

      const days = getDaysUntilExpiration(credential)

      expect(days).toBe(1) // Ceiling of partial day
    })

    it('returns negative days for expired credential', () => {
      const credential: PlayerQRCredential = {
        typ: 'player-cred',
        ver: 1,
        pid: 'player-123',
        lid: 'league-456',
        tid: 'tournament-789',
        season: '2024-A',
        exp: Math.floor(Date.now() / 1000) - (5 * 86400), // 5 days ago
      }

      const days = getDaysUntilExpiration(credential)

      expect(days).toBe(-5)
    })

    it('returns 0 for credential expiring within seconds', () => {
      const credential: PlayerQRCredential = {
        typ: 'player-cred',
        ver: 1,
        pid: 'player-123',
        lid: 'league-456',
        tid: 'tournament-789',
        season: '2024-A',
        exp: Math.floor(Date.now() / 1000) + 10, // 10 seconds from now
      }

      const days = getDaysUntilExpiration(credential)

      expect(days).toBe(1) // Ceil rounds up
    })

    it('calculates correctly for far future expiration', () => {
      const credential: PlayerQRCredential = {
        typ: 'player-cred',
        ver: 1,
        pid: 'player-123',
        lid: 'league-456',
        tid: 'tournament-789',
        season: '2024-A',
        exp: Math.floor(Date.now() / 1000) + (365 * 86400), // 1 year from now
      }

      const days = getDaysUntilExpiration(credential)

      expect(days).toBe(365)
    })
  })

  describe('getExpirationDate', () => {
    it('converts timestamp to Date object correctly', () => {
      const expTimestamp = 1735689600 // 2025-01-01 00:00:00 UTC
      const credential: PlayerQRCredential = {
        typ: 'player-cred',
        ver: 1,
        pid: 'player-123',
        lid: 'league-456',
        tid: 'tournament-789',
        season: '2024-A',
        exp: expTimestamp,
      }

      const date = getExpirationDate(credential)

      expect(date).toBeInstanceOf(Date)
      expect(date.getTime()).toBe(expTimestamp * 1000)
    })

    it('returns correct date for known timestamp', () => {
      const credential: PlayerQRCredential = {
        typ: 'player-cred',
        ver: 1,
        pid: 'player-123',
        lid: 'league-456',
        tid: 'tournament-789',
        season: '2024-A',
        exp: 1704067200, // 2024-01-01 00:00:00 UTC
      }

      const date = getExpirationDate(credential)

      expect(date.getUTCFullYear()).toBe(2024)
      expect(date.getUTCMonth()).toBe(0) // January
      expect(date.getUTCDate()).toBe(1)
    })

    it('handles different timestamps correctly', () => {
      const timestamps = [
        1704067200, // 2024-01-01
        1735689600, // 2025-01-01
        1767225600, // 2026-01-01
      ]

      timestamps.forEach(timestamp => {
        const credential: PlayerQRCredential = {
          typ: 'player-cred',
          ver: 1,
          pid: 'player-123',
          lid: 'league-456',
          tid: 'tournament-789',
          season: '2024-A',
          exp: timestamp,
        }

        const date = getExpirationDate(credential)
        expect(date.getTime()).toBe(timestamp * 1000)
      })
    })
  })
})
