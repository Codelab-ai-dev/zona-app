import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '../use-mobile'

describe('useIsMobile', () => {
  const MOBILE_BREAKPOINT = 768
  let listeners: ((event: { matches: boolean }) => void)[] = []

  const createMockMatchMedia = (matches: boolean) => {
    return vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, callback: () => void) => {
        if (event === 'change') {
          listeners.push(callback)
        }
      }),
      removeEventListener: vi.fn((event: string, callback: () => void) => {
        if (event === 'change') {
          listeners = listeners.filter(l => l !== callback)
        }
      }),
      dispatchEvent: vi.fn()
    }))
  }

  beforeEach(() => {
    listeners = []
  })

  it('should return false for desktop viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMockMatchMedia(false)
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('should return true for mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 375
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMockMatchMedia(true)
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('should return false for viewport at breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: MOBILE_BREAKPOINT
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMockMatchMedia(false)
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('should return true for viewport just below breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: MOBILE_BREAKPOINT - 1
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMockMatchMedia(true)
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('should update when viewport changes from desktop to mobile', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMockMatchMedia(false)
    })

    const { result, rerender } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Simulate viewport change
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375
      })
      // Trigger change listeners
      listeners.forEach(listener => listener({ matches: true }))
    })

    rerender()
    expect(result.current).toBe(true)
  })

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerMock = vi.fn()
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerMock,
        dispatchEvent: vi.fn()
      }))
    })

    const { unmount } = renderHook(() => useIsMobile())
    unmount()

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
