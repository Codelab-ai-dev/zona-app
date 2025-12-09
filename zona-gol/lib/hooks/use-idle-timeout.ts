"use client"

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './use-auth'
import { toast } from 'sonner'

interface UseIdleTimeoutOptions {
  timeout?: number // Timeout en milisegundos (por defecto 20 minutos)
  onIdle?: () => void
  promptBeforeIdle?: number // Tiempo en ms para mostrar advertencia antes del cierre
}

export function useIdleTimeout({
  timeout = 20 * 60 * 1000, // 20 minutos por defecto
  onIdle,
  promptBeforeIdle = 2 * 60 * 1000, // 2 minutos de advertencia
}: UseIdleTimeoutOptions = {}) {
  const { signOut, isAuthenticated } = useAuth()
  const router = useRouter()
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutIdRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const handleLogout = useCallback(async () => {
    console.log('🔴 Sesión cerrada por inactividad')

    try {
      await signOut()
      toast.error('Tu sesión ha sido cerrada por inactividad')
      router.push('/login')

      if (onIdle) {
        onIdle()
      }
    } catch (error) {
      console.error('Error al cerrar sesión por inactividad:', error)
    }
  }, [signOut, router, onIdle])

  const showWarning = useCallback(() => {
    const remainingTime = Math.floor(promptBeforeIdle / 1000 / 60)
    toast.warning(
      `Tu sesión se cerrará en ${remainingTime} minutos por inactividad. Haz clic en cualquier lugar para continuar.`,
      {
        duration: promptBeforeIdle,
        id: 'idle-warning',
      }
    )
  }, [promptBeforeIdle])

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Limpiar timers existentes
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
    }
    if (warningTimeoutIdRef.current) {
      clearTimeout(warningTimeoutIdRef.current)
    }

    // Dismiss warning toast if active
    toast.dismiss('idle-warning')

    // Solo configurar timers si el usuario está autenticado
    if (!isAuthenticated) {
      return
    }

    // Configurar warning timer (advertencia antes del cierre)
    const warningTime = timeout - promptBeforeIdle
    if (warningTime > 0) {
      warningTimeoutIdRef.current = setTimeout(() => {
        showWarning()
      }, warningTime)
    }

    // Configurar logout timer (cierre de sesión)
    timeoutIdRef.current = setTimeout(() => {
      handleLogout()
    }, timeout)
  }, [timeout, promptBeforeIdle, isAuthenticated, handleLogout, showWarning])

  useEffect(() => {
    // Solo activar el detector de inactividad si el usuario está autenticado
    if (!isAuthenticated) {
      // Limpiar timers si el usuario no está autenticado
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
      if (warningTimeoutIdRef.current) {
        clearTimeout(warningTimeoutIdRef.current)
      }
      return
    }

    // Eventos que indican actividad del usuario
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ]

    // Resetear timer en cualquier actividad
    const handleActivity = () => {
      resetTimer()
    }

    // Agregar event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity)
    })

    // Iniciar el timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })

      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
      if (warningTimeoutIdRef.current) {
        clearTimeout(warningTimeoutIdRef.current)
      }

      toast.dismiss('idle-warning')
    }
  }, [isAuthenticated, resetTimer])

  return {
    lastActivity: lastActivityRef.current,
    resetTimer,
  }
}
