// =====================================================
// ERROR HANDLING & RATE LIMITING TESTS
// =====================================================
// Tests para verificar el manejo de errores y rate limiting

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =====================================================
// TEST: Network Error Detection
// =====================================================
describe('Network Error Detection', () => {
  // Reimplementamos la función para testear
  function isNetworkError(error: Error | unknown): boolean {
    if (!error) return false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      errorMessage?.includes('ETIMEDOUT') ||
      errorMessage?.includes('ECONNRESET') ||
      errorMessage?.includes('ECONNREFUSED') ||
      errorMessage?.includes('fetch failed') ||
      errorMessage?.includes('network') ||
      errorMessage?.includes('Failed to fetch') ||
      errorMessage?.includes('NetworkError') ||
      errorMessage?.includes('ConnectTimeoutError')
    );
  }

  it('should detect ETIMEDOUT errors', () => {
    const error = new Error('Request failed: ETIMEDOUT');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should detect ECONNRESET errors', () => {
    const error = new Error('read ECONNRESET');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should detect ECONNREFUSED errors', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:5432');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should detect fetch failed errors', () => {
    const error = new Error('TypeError: fetch failed');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should detect ConnectTimeoutError', () => {
    const error = new Error('ConnectTimeoutError: Connection timed out');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should NOT detect auth errors as network errors', () => {
    const error = new Error('Invalid refresh token');
    expect(isNetworkError(error)).toBe(false);
  });

  it('should NOT detect validation errors as network errors', () => {
    const error = new Error('Validation failed: email is required');
    expect(isNetworkError(error)).toBe(false);
  });

  it('should handle null/undefined gracefully', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

// =====================================================
// TEST: Network Error Rate Limiter
// =====================================================
describe('Network Error Rate Limiter', () => {
  // Simulamos el rate limiter del supabase-provider
  let networkErrorState: {
    lastError: number;
    errorCount: number;
    isInCooldown: boolean;
  };

  const COOLDOWN_MS = 30000;
  const MAX_ERRORS_BEFORE_COOLDOWN = 3;
  const RESET_WINDOW_MS = 60000;

  function shouldSkipNetworkRequest(): boolean {
    const now = Date.now();
    if (networkErrorState.isInCooldown) {
      if (now - networkErrorState.lastError > COOLDOWN_MS) {
        networkErrorState.isInCooldown = false;
        networkErrorState.errorCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  function recordNetworkError(): void {
    const now = Date.now();
    if (now - networkErrorState.lastError > RESET_WINDOW_MS) {
      networkErrorState.errorCount = 0;
    }
    networkErrorState.lastError = now;
    networkErrorState.errorCount++;
    if (networkErrorState.errorCount >= MAX_ERRORS_BEFORE_COOLDOWN) {
      networkErrorState.isInCooldown = true;
    }
  }

  beforeEach(() => {
    networkErrorState = {
      lastError: 0,
      errorCount: 0,
      isInCooldown: false,
    };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests when no errors have occurred', () => {
    expect(shouldSkipNetworkRequest()).toBe(false);
  });

  it('should allow requests after 1-2 errors', () => {
    recordNetworkError();
    expect(shouldSkipNetworkRequest()).toBe(false);

    recordNetworkError();
    expect(shouldSkipNetworkRequest()).toBe(false);
  });

  it('should enter cooldown after 3 errors', () => {
    recordNetworkError();
    recordNetworkError();
    recordNetworkError();

    expect(networkErrorState.isInCooldown).toBe(true);
    expect(shouldSkipNetworkRequest()).toBe(true);
  });

  it('should exit cooldown after 30 seconds', () => {
    recordNetworkError();
    recordNetworkError();
    recordNetworkError();

    expect(shouldSkipNetworkRequest()).toBe(true);

    // Avanzar 31 segundos
    vi.advanceTimersByTime(31000);

    expect(shouldSkipNetworkRequest()).toBe(false);
    expect(networkErrorState.isInCooldown).toBe(false);
    expect(networkErrorState.errorCount).toBe(0);
  });

  it('should reset error count after 60 seconds of no errors', () => {
    recordNetworkError();
    recordNetworkError();

    expect(networkErrorState.errorCount).toBe(2);

    // Avanzar 61 segundos
    vi.advanceTimersByTime(61000);

    recordNetworkError(); // Este debería ser el primer error de una nueva ventana

    expect(networkErrorState.errorCount).toBe(1);
  });
});

// =====================================================
// TEST: Promise Timeout Helper
// =====================================================
describe('Promise Timeout Helper', () => {
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

  it('should resolve if promise completes before timeout', async () => {
    const fastPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('success'), 100);
    });

    const resultPromise = withTimeout(fastPromise, 1000);

    vi.advanceTimersByTime(100);

    await expect(resultPromise).resolves.toBe('success');
  });

  it('should reject with timeout error if promise takes too long', async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('success'), 5000);
    });

    const resultPromise = withTimeout(slowPromise, 1000, 'Custom timeout');

    vi.advanceTimersByTime(1001);

    await expect(resultPromise).rejects.toThrow('Custom timeout');
  });

  it('should preserve original rejection', async () => {
    const failingPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Original error')), 100);
    });

    const resultPromise = withTimeout(failingPromise, 1000);

    vi.advanceTimersByTime(100);

    await expect(resultPromise).rejects.toThrow('Original error');
  });
});

// =====================================================
// TEST: Query Provider Retry Logic
// =====================================================
describe('Query Provider Retry Logic', () => {
  function isNetworkError(error: unknown): boolean {
    if (!error) return false;
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('ETIMEDOUT') ||
      message.includes('ECONNRESET') ||
      message.includes('ECONNREFUSED') ||
      message.includes('fetch failed') ||
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('ConnectTimeoutError')
    );
  }

  function shouldRetry(failureCount: number, error: unknown): boolean {
    // No reintentar errores de red
    if (isNetworkError(error)) {
      return false;
    }
    // Para otros errores, máximo 1 reintento
    return failureCount < 1;
  }

  it('should NOT retry on network errors', () => {
    const networkError = new Error('fetch failed');
    expect(shouldRetry(0, networkError)).toBe(false);
    expect(shouldRetry(1, networkError)).toBe(false);
  });

  it('should NOT retry on ECONNRESET', () => {
    const error = new Error('read ECONNRESET');
    expect(shouldRetry(0, error)).toBe(false);
  });

  it('should retry once on other errors', () => {
    const error = new Error('Some validation error');
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(false);
  });

  it('should retry once on server errors', () => {
    const error = new Error('Internal server error');
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(false);
  });
});

// =====================================================
// TEST: Refresh Token Error Detection
// =====================================================
describe('Refresh Token Error Detection', () => {
  function isRefreshTokenError(error: unknown): boolean {
    if (!error) return false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code;
    return (
      errorMessage?.includes('Refresh Token') ||
      errorMessage?.includes('refresh_token') ||
      errorCode === 'refresh_token_not_found' ||
      errorCode === 'invalid_refresh_token'
    );
  }

  it('should detect "Refresh Token" in message', () => {
    const error = new Error('Refresh Token not found');
    expect(isRefreshTokenError(error)).toBe(true);
  });

  it('should detect "refresh_token" in message', () => {
    const error = new Error('Invalid refresh_token');
    expect(isRefreshTokenError(error)).toBe(true);
  });

  it('should detect refresh_token_not_found code', () => {
    const error = { code: 'refresh_token_not_found', message: 'Error' };
    expect(isRefreshTokenError(error)).toBe(true);
  });

  it('should detect invalid_refresh_token code', () => {
    const error = { code: 'invalid_refresh_token', message: 'Error' };
    expect(isRefreshTokenError(error)).toBe(true);
  });

  it('should NOT detect regular auth errors', () => {
    const error = new Error('Invalid credentials');
    expect(isRefreshTokenError(error)).toBe(false);
  });

  it('should NOT detect network errors', () => {
    const error = new Error('fetch failed');
    expect(isRefreshTokenError(error)).toBe(false);
  });
});
