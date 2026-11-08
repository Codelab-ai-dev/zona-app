import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const warning = vi.fn()
vi.mock('sonner', () => ({ toast: { warning: (...a: unknown[]) => warning(...a), dismiss: vi.fn() } }))

import { useIdleTimeout } from './use-idle-timeout'

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    warning.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('warns before the end and signs out after the timeout', () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleTimeout(onIdle, { timeout: 20_000, warning: 5_000 }))

    act(() => vi.advanceTimersByTime(15_000))
    expect(warning).toHaveBeenCalledTimes(1)
    expect(onIdle).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(5_000))
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it('activity restarts the countdown', () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleTimeout(onIdle, { timeout: 20_000, warning: 5_000 }))

    act(() => vi.advanceTimersByTime(14_000))
    act(() => {
      vi.setSystemTime(Date.now() + 2_000)
      window.dispatchEvent(new Event('keydown'))
    })
    act(() => vi.advanceTimersByTime(14_000))
    expect(onIdle).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(6_000))
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it('"Continuar" in the warning keeps the session', () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleTimeout(onIdle, { timeout: 20_000, warning: 5_000 }))
    act(() => vi.advanceTimersByTime(15_000))
    const { action } = warning.mock.calls[0]![1] as { action: { onClick: () => void } }
    act(() => action.onClick())
    act(() => vi.advanceTimersByTime(10_000))
    expect(onIdle).not.toHaveBeenCalled()
  })
})
