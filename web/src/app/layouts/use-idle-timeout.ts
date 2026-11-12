import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

const EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const

export const IDLE_TIMEOUT_MS = 20 * 60_000
export const IDLE_WARNING_MS = 2 * 60_000

/**
 * Signs out after a period without user activity (as the original app did):
 * a warning toast with "Continuar" appears before the end.
 */
export function useIdleTimeout(onIdle: () => void, { timeout = IDLE_TIMEOUT_MS, warning = IDLE_WARNING_MS } = {}) {
  const onIdleRef = useRef(onIdle)
  useEffect(() => {
    onIdleRef.current = onIdle
  })

  useEffect(() => {
    let warnTimer: ReturnType<typeof setTimeout>
    let idleTimer: ReturnType<typeof setTimeout>
    let toastId: string | number | undefined
    let last = 0

    const schedule = () => {
      clearTimeout(warnTimer)
      clearTimeout(idleTimer)
      if (toastId !== undefined) {
        toast.dismiss(toastId)
        toastId = undefined
      }
      warnTimer = setTimeout(() => {
        toastId = toast.warning('Tu sesión se cerrará por inactividad', {
          description: `En ${Math.round(warning / 60_000)} minutos.`,
          duration: warning,
          action: { label: 'Continuar', onClick: schedule },
        })
      }, timeout - warning)
      idleTimer = setTimeout(() => onIdleRef.current(), timeout)
    }
    // Activity resets the timers, at most once per second.
    const onActivity = () => {
      const now = Date.now()
      if (now - last < 1000) return
      last = now
      schedule()
    }

    schedule()
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    return () => {
      clearTimeout(warnTimer)
      clearTimeout(idleTimer)
      if (toastId !== undefined) toast.dismiss(toastId)
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [timeout, warning])
}
