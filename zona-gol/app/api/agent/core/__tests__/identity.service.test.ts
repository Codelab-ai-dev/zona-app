// =====================================================
// IDENTITY SERVICE TESTS
// =====================================================
// Tests unitarios para IdentityService
// =====================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdentityService } from '../identity.service';
import { UserRole } from '@/lib/types/agent.types';

// Mock de Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

describe('IdentityService', () => {
  describe('normalizePhoneNumber', () => {
    it('should add + prefix if missing', () => {
      const result = (IdentityService as any).normalizePhoneNumber('5215512345678');
      expect(result).toBe('+5215512345678');
    });

    it('should remove spaces and dashes', () => {
      const result = (IdentityService as any).normalizePhoneNumber('+52 55 1234-5678');
      expect(result).toBe('+525512345678');
    });

    it('should keep existing + prefix', () => {
      const result = (IdentityService as any).normalizePhoneNumber('+5215512345678');
      expect(result).toBe('+5215512345678');
    });

    it('should remove parentheses', () => {
      const result = (IdentityService as any).normalizePhoneNumber('+52 (55) 1234-5678');
      expect(result).toBe('+525512345678');
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate 6-digit code', () => {
      const code = IdentityService.generateVerificationCode();
      expect(code).toHaveLength(6);
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThanOrEqual(999999);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(IdentityService.generateVerificationCode());
      }
      // Al menos 95 códigos únicos de 100 (permite algunas colisiones)
      expect(codes.size).toBeGreaterThan(95);
    });
  });

  describe('checkPermission', () => {
    it('should allow super_admin all actions', async () => {
      const identity = {
        userIdentifier: 'user1',
        channel: 'web' as const,
        userId: 'user1',
        role: 'super_admin' as UserRole,
        leagueId: 'league1',
        isLinked: true,
      };

      const result = await IdentityService.checkPermission(
        identity,
        'any_action',
        'any_league'
      );

      expect(result).toBe(true);
    });

    it('should deny unlinked users', async () => {
      const identity = {
        userIdentifier: '+5215512345678',
        channel: 'whatsapp' as const,
        isLinked: false,
      };

      const result = await IdentityService.checkPermission(
        identity,
        'view_matches'
      );

      expect(result).toBe(false);
    });

    it('should allow league_admin only in their league', async () => {
      const identity = {
        userIdentifier: 'user1',
        channel: 'web' as const,
        userId: 'user1',
        role: 'league_admin' as UserRole,
        leagueId: 'league1',
        isLinked: true,
      };

      // Misma liga - permitido
      const allowed = await IdentityService.checkPermission(
        identity,
        'manage_league',
        'league1'
      );
      expect(allowed).toBe(true);

      // Otra liga - denegado
      const denied = await IdentityService.checkPermission(
        identity,
        'manage_league',
        'league2'
      );
      expect(denied).toBe(false);
    });

    it('should allow team_owner limited actions', async () => {
      const identity = {
        userIdentifier: 'user1',
        channel: 'web' as const,
        userId: 'user1',
        role: 'team_owner' as UserRole,
        leagueId: 'league1',
        isLinked: true,
      };

      // Acción permitida
      const allowed = await IdentityService.checkPermission(
        identity,
        'view_matches'
      );
      expect(allowed).toBe(true);

      // Acción no permitida
      const denied = await IdentityService.checkPermission(
        identity,
        'manage_league'
      );
      expect(denied).toBe(false);
    });

    it('should allow public users very limited actions', async () => {
      const identity = {
        userIdentifier: 'user1',
        channel: 'web' as const,
        userId: 'user1',
        role: 'public' as UserRole,
        leagueId: 'league1',
        isLinked: true,
      };

      // Acción permitida
      const allowed = await IdentityService.checkPermission(
        identity,
        'view_standings'
      );
      expect(allowed).toBe(true);

      // Acción no permitida
      const denied = await IdentityService.checkPermission(
        identity,
        'view_team'
      );
      expect(denied).toBe(false);
    });
  });
});

describe('IdentityService Integration Tests', () => {
  // Estos tests requieren una base de datos de prueba
  // Se pueden ejecutar con `npm run test:integration`

  it.skip('should resolve WhatsApp identity for linked user', async () => {
    // Test de integración real con Supabase
  });

  it.skip('should resolve WhatsApp identity for unlinked user', async () => {
    // Test de integración real con Supabase
  });

  it.skip('should link WhatsApp user successfully', async () => {
    // Test de integración real con Supabase
  });

  it.skip('should prevent linking already linked phone', async () => {
    // Test de integración real con Supabase
  });
});
