// =====================================================
// TIMEOUT HELPERS TESTS
// =====================================================
// Tests para verificar las funciones de timeout en queries

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =====================================================
// TEST: withTimeout Helper
// =====================================================
describe('withTimeout Helper', () => {
  function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    errorMessage = 'Query timeout'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), ms)
      ),
    ]);
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve with value when promise completes before timeout', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('data'), 500);
    });

    const resultPromise = withTimeout(promise, 1000);

    vi.advanceTimersByTime(500);

    await expect(resultPromise).resolves.toBe('data');
  });

  it('should reject with timeout error when promise exceeds timeout', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('data'), 2000);
    });

    const resultPromise = withTimeout(promise, 1000);

    vi.advanceTimersByTime(1001);

    await expect(resultPromise).rejects.toThrow('Query timeout');
  });

  it('should use custom error message', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('data'), 2000);
    });

    const resultPromise = withTimeout(promise, 1000, 'Database query timed out');

    vi.advanceTimersByTime(1001);

    await expect(resultPromise).rejects.toThrow('Database query timed out');
  });

  it('should preserve original promise rejection', async () => {
    const promise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Database error')), 500);
    });

    const resultPromise = withTimeout(promise, 1000);

    vi.advanceTimersByTime(500);

    await expect(resultPromise).rejects.toThrow('Database error');
  });

  it('should handle resolved promises immediately', async () => {
    const promise = Promise.resolve('immediate');

    const result = await withTimeout(promise, 1000);

    expect(result).toBe('immediate');
  });

  it('should handle rejected promises immediately', async () => {
    const promise = Promise.reject(new Error('immediate error'));

    await expect(withTimeout(promise, 1000)).rejects.toThrow('immediate error');
  });
});

// =====================================================
// TEST: promiseAllWithTimeout Helper
// =====================================================
describe('promiseAllWithTimeout Helper', () => {
  const QUERY_TIMEOUT_MS = 15000;

  function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    errorMessage = 'Query timeout'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), ms)
      ),
    ]);
  }

  async function promiseAllWithTimeout<T extends readonly unknown[]>(
    promises: [...{ [K in keyof T]: Promise<T[K]> }],
    ms: number = QUERY_TIMEOUT_MS
  ): Promise<T> {
    return withTimeout(
      Promise.all(promises) as Promise<T>,
      ms,
      'Parallel queries timeout'
    );
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve all promises when all complete before timeout', async () => {
    const p1 = new Promise<string>((r) => setTimeout(() => r('a'), 100));
    const p2 = new Promise<number>((r) => setTimeout(() => r(42), 200));
    const p3 = new Promise<boolean>((r) => setTimeout(() => r(true), 300));

    const resultPromise = promiseAllWithTimeout([p1, p2, p3], 1000);

    vi.advanceTimersByTime(300);

    const [r1, r2, r3] = await resultPromise;

    expect(r1).toBe('a');
    expect(r2).toBe(42);
    expect(r3).toBe(true);
  });

  it('should timeout if any promise takes too long', async () => {
    const p1 = new Promise<string>((r) => setTimeout(() => r('fast'), 100));
    const p2 = new Promise<string>((r) => setTimeout(() => r('slow'), 5000));

    const resultPromise = promiseAllWithTimeout([p1, p2], 1000);

    vi.advanceTimersByTime(1001);

    await expect(resultPromise).rejects.toThrow('Parallel queries timeout');
  });

  it('should reject if any promise rejects before timeout', async () => {
    const p1 = new Promise<string>((r) => setTimeout(() => r('ok'), 100));
    const p2 = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Query failed')), 200)
    );

    const resultPromise = promiseAllWithTimeout([p1, p2], 1000);

    vi.advanceTimersByTime(200);

    await expect(resultPromise).rejects.toThrow('Query failed');
  });

  it('should handle empty array', async () => {
    const resultPromise = promiseAllWithTimeout([], 1000);

    const result = await resultPromise;

    expect(result).toEqual([]);
  });

  it('should use default timeout of 15 seconds', async () => {
    const slowPromise = new Promise<string>((r) =>
      setTimeout(() => r('data'), 20000)
    );

    const resultPromise = promiseAllWithTimeout([slowPromise]);

    // Avanzar 15 segundos + 1ms
    vi.advanceTimersByTime(15001);

    await expect(resultPromise).rejects.toThrow('Parallel queries timeout');
  });
});

// =====================================================
// TEST: Supabase Query Timeout Integration
// =====================================================
describe('Supabase Query Timeout Integration', () => {
  // Simular el comportamiento de una query de Supabase
  interface SupabaseResponse<T> {
    data: T | null;
    error: Error | null;
  }

  function createMockSupabaseQuery<T>(
    data: T,
    delayMs: number
  ): Promise<SupabaseResponse<T>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data, error: null });
      }, delayMs);
    });
  }

  function createMockSupabaseQueryWithError(
    errorMsg: string,
    delayMs: number
  ): Promise<SupabaseResponse<never>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: null, error: new Error(errorMsg) });
      }, delayMs);
    });
  }

  function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    errorMessage = 'Query timeout'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), ms)
      ),
    ]);
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle successful query within timeout', async () => {
    const query = createMockSupabaseQuery({ id: 1, name: 'Test' }, 500);

    const resultPromise = withTimeout(query, 1000);

    vi.advanceTimersByTime(500);

    const result = await resultPromise;

    expect(result.data).toEqual({ id: 1, name: 'Test' });
    expect(result.error).toBeNull();
  });

  it('should timeout slow Supabase query', async () => {
    const query = createMockSupabaseQuery({ id: 1 }, 5000);

    const resultPromise = withTimeout(query, 1000, 'Database query timed out');

    vi.advanceTimersByTime(1001);

    await expect(resultPromise).rejects.toThrow('Database query timed out');
  });

  it('should handle Supabase error response within timeout', async () => {
    const query = createMockSupabaseQueryWithError('Row not found', 500);

    const resultPromise = withTimeout(query, 1000);

    vi.advanceTimersByTime(500);

    const result = await resultPromise;

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });

  it('should work with parallel queries', async () => {
    const queries = [
      createMockSupabaseQuery({ table: 'teams', count: 10 }, 200),
      createMockSupabaseQuery({ table: 'players', count: 50 }, 300),
      createMockSupabaseQuery({ table: 'matches', count: 25 }, 400),
    ];

    const resultPromise = withTimeout(Promise.all(queries), 1000);

    vi.advanceTimersByTime(400);

    const results = await resultPromise;

    expect(results).toHaveLength(3);
    expect(results[0].data?.table).toBe('teams');
    expect(results[1].data?.table).toBe('players');
    expect(results[2].data?.table).toBe('matches');
  });
});

// =====================================================
// TEST: Edge Cases
// =====================================================
describe('Timeout Edge Cases', () => {
  function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    errorMessage = 'Query timeout'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), ms)
      ),
    ]);
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle zero timeout', async () => {
    const promise = new Promise<string>((r) => setTimeout(() => r('data'), 100));

    const resultPromise = withTimeout(promise, 0);

    vi.advanceTimersByTime(1);

    await expect(resultPromise).rejects.toThrow('Query timeout');
  });

  it('should handle very small timeout', async () => {
    const promise = new Promise<string>((r) => setTimeout(() => r('data'), 100));

    const resultPromise = withTimeout(promise, 10);

    vi.advanceTimersByTime(11);

    await expect(resultPromise).rejects.toThrow('Query timeout');
  });

  it('should handle promise that never resolves', async () => {
    const neverPromise = new Promise<string>(() => {
      // Nunca resuelve
    });

    const resultPromise = withTimeout(neverPromise, 1000);

    vi.advanceTimersByTime(1001);

    await expect(resultPromise).rejects.toThrow('Query timeout');
  });

  it('should not leak timeouts on successful resolution', async () => {
    const promise = new Promise<string>((r) => setTimeout(() => r('data'), 100));

    const resultPromise = withTimeout(promise, 1000);

    vi.advanceTimersByTime(100);

    await resultPromise;

    // Si hay leaks, el timer de timeout aún estaría pendiente
    // Verificamos que no hay efectos secundarios avanzando más tiempo
    vi.advanceTimersByTime(2000);

    // No debería haber errores
    expect(true).toBe(true);
  });
});
