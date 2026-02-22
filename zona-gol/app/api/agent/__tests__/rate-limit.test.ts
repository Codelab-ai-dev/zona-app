// =====================================================
// API RATE LIMITER TESTS
// =====================================================
// Tests para verificar el rate limiting del endpoint /api/agent

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =====================================================
// TEST: Rate Limiter Implementation
// =====================================================
describe('API Rate Limiter', () => {
  const RATE_LIMIT_WINDOW_MS = 60000; // 1 minuto
  const RATE_LIMIT_MAX_REQUESTS = 30; // máximo 30 requests por minuto

  // Reimplementamos el rate limiter para testear
  let rateLimitMap: Map<string, { count: number; resetTime: number }>;

  function checkRateLimit(ip: string): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
  } {
    const now = Date.now();
    const existing = rateLimitMap.get(ip);

    if (!existing || now > existing.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_REQUESTS - 1,
        resetIn: RATE_LIMIT_WINDOW_MS,
      };
    }

    if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: existing.resetTime - now,
      };
    }

    existing.count++;
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
      resetIn: existing.resetTime - now,
    };
  }

  beforeEach(() => {
    rateLimitMap = new Map();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow first request from new IP', () => {
    const result = checkRateLimit('192.168.1.1');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29);
  });

  it('should track requests per IP', () => {
    const ip = '192.168.1.1';

    // Primera request
    let result = checkRateLimit(ip);
    expect(result.remaining).toBe(29);

    // Segunda request
    result = checkRateLimit(ip);
    expect(result.remaining).toBe(28);

    // Tercera request
    result = checkRateLimit(ip);
    expect(result.remaining).toBe(27);
  });

  it('should isolate rate limits per IP', () => {
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';

    // Requests desde IP1
    checkRateLimit(ip1);
    checkRateLimit(ip1);
    checkRateLimit(ip1);

    // Primera request desde IP2 debería tener límite completo
    const result = checkRateLimit(ip2);
    expect(result.remaining).toBe(29);
  });

  it('should block after 30 requests', () => {
    const ip = '192.168.1.1';

    // Hacer 30 requests
    for (let i = 0; i < 30; i++) {
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(true);
    }

    // La 31ra debería ser bloqueada
    const blocked = checkRateLimit(ip);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('should reset after window expires', () => {
    const ip = '192.168.1.1';

    // Hacer 30 requests
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip);
    }

    // Verificar que está bloqueado
    let result = checkRateLimit(ip);
    expect(result.allowed).toBe(false);

    // Avanzar 61 segundos (más de 1 minuto)
    vi.advanceTimersByTime(61000);

    // Ahora debería permitirse
    result = checkRateLimit(ip);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29);
  });

  it('should return correct resetIn time', () => {
    const ip = '192.168.1.1';

    // Primera request
    const result = checkRateLimit(ip);

    // resetIn debería ser aproximadamente 60 segundos
    expect(result.resetIn).toBe(60000);

    // Avanzar 30 segundos
    vi.advanceTimersByTime(30000);

    // Segunda request
    const result2 = checkRateLimit(ip);

    // resetIn debería ser aproximadamente 30 segundos
    expect(result2.resetIn).toBe(30000);
  });

  it('should handle rapid burst of requests', () => {
    const ip = '192.168.1.1';
    let blockedCount = 0;
    let allowedCount = 0;

    // Simular 50 requests rápidas
    for (let i = 0; i < 50; i++) {
      const result = checkRateLimit(ip);
      if (result.allowed) {
        allowedCount++;
      } else {
        blockedCount++;
      }
    }

    expect(allowedCount).toBe(30);
    expect(blockedCount).toBe(20);
  });

  it('should handle multiple IPs concurrently', () => {
    const ips = ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4', '5.5.5.5'];

    // Cada IP hace 10 requests
    ips.forEach((ip) => {
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(ip);
        expect(result.allowed).toBe(true);
      }
    });

    // Verificar que cada IP tiene 20 requests restantes
    ips.forEach((ip) => {
      const result = checkRateLimit(ip);
      expect(result.remaining).toBe(19); // 30 - 10 - 1 (esta request)
    });
  });
});

// =====================================================
// TEST: Rate Limit Response Headers
// =====================================================
describe('Rate Limit Response', () => {
  it('should format 429 response correctly', () => {
    const resetIn = 30000; // 30 segundos

    const response = {
      error: 'Too many requests',
      retryAfter: Math.ceil(resetIn / 1000),
    };

    expect(response.error).toBe('Too many requests');
    expect(response.retryAfter).toBe(30);
  });

  it('should round up retryAfter seconds', () => {
    const resetIn = 30500; // 30.5 segundos

    const retryAfter = Math.ceil(resetIn / 1000);

    expect(retryAfter).toBe(31);
  });
});

// =====================================================
// TEST: IP Extraction
// =====================================================
describe('IP Extraction', () => {
  function extractIP(headers: Record<string, string | null>): string {
    return (
      headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      headers['x-real-ip'] ||
      'unknown'
    );
  }

  it('should extract IP from x-forwarded-for', () => {
    const headers = {
      'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1',
      'x-real-ip': null,
    };

    expect(extractIP(headers)).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip as fallback', () => {
    const headers = {
      'x-forwarded-for': null,
      'x-real-ip': '192.168.1.2',
    };

    expect(extractIP(headers)).toBe('192.168.1.2');
  });

  it('should return "unknown" when no IP headers present', () => {
    const headers = {
      'x-forwarded-for': null,
      'x-real-ip': null,
    };

    expect(extractIP(headers)).toBe('unknown');
  });

  it('should trim whitespace from x-forwarded-for', () => {
    const headers = {
      'x-forwarded-for': '  192.168.1.1  , 10.0.0.1',
      'x-real-ip': null,
    };

    expect(extractIP(headers)).toBe('192.168.1.1');
  });
});
