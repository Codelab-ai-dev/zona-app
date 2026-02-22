"use client"

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './use-auth'
import { useSupabase } from '../providers/supabase-provider'
import { toast } from 'sonner'

interface UseIdleTimeoutOptions {
  timeout?: number // Timeout en milisegundos (por defecto 20 minutos)
  onIdle?: () => void
  promptBeforeIdle?: number // Tiempo en ms para mostrar advertencia antes del cierre
  tokenRefreshInterval?: number // Intervalo para refrescar el token (por defecto 10 minutos)
}

export function useIdleTimeout({
  timeout = 20 * 60 * 1000, // 20 minutos por defecto
  onIdle,
  promptBeforeIdle = 2 * 60 * 1000, // 2 minutos de advertencia
  tokenRefreshInterval = 10 * 60 * 1000, // Refrescar token cada 10 minutos
}: UseIdleTimeoutOptions = {}) {
  const { signOut, isAuthenticated } = useAuth()
  const { supabase } = useSupabase()
  const router = useRouter()

  // Usamos ref para el timestamp de última actividad para evitar re-renders
  const lastActivityRef = useRef<number>(Date.now())

  // Timestamp del último refresh del token
  const lastTokenRefreshRef = useRef<number>(Date.now())

  // Para controlar si ya mostramos el warning y evitar múltiples toasts
  const warningShownRef = useRef<boolean>(false)

  // Intervalo de chequeo
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Flag para evitar llamadas concurrentes a refreshToken
  const isRefreshingRef = useRef<boolean>(false)

  // Flag para saber si el hook está montado
  const isMountedRef = useRef<boolean>(true)

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
    if (warningShownRef.current) return

    const remainingTime = Math.floor(promptBeforeIdle / 1000 / 60)
    warningShownRef.current = true

    toast.warning(
      `Tu sesión se cerrará en ${remainingTime} minutos por inactividad. Haz clic en cualquier lugar para continuar.`,
      {
        duration: promptBeforeIdle,
        id: 'idle-warning',
        onDismiss: () => {
          // Si el usuario cierra el toast manualmente, consideramos que está activo
          lastActivityRef.current = Date.now()
          warningShownRef.current = false
        },
        action: {
          label: "Continuar",
          onClick: () => {
            // El click ya actualizará la actividad, pero forzamos por seguridad
            lastActivityRef.current = Date.now()
            warningShownRef.current = false
          }
        }
      }
    )
  }, [promptBeforeIdle])

  // Función para refrescar el token de Supabase mientras el usuario esté activo
  // Protegida contra llamadas concurrentes
  const refreshTokenIfNeeded = useCallback(async () => {
    // Evitar llamadas concurrentes
    if (isRefreshingRef.current) return
    if (!isMountedRef.current) return

    const now = Date.now()
    const timeSinceLastRefresh = now - lastTokenRefreshRef.current
    const timeSinceLastActivity = now - lastActivityRef.current

    // Solo refrescar si:
    // 1. Ha pasado suficiente tiempo desde el último refresh
    // 2. El usuario ha tenido actividad reciente (no está inactivo)
    if (timeSinceLastRefresh >= tokenRefreshInterval && timeSinceLastActivity < timeout) {
      isRefreshingRef.current = true
      try {
        const { error } = await supabase.auth.refreshSession()

        if (!isMountedRef.current) return // Componente desmontado durante la operación

        if (error) {
          console.warn('[Auth] Token refresh failed:', error.message)
        } else {
          lastTokenRefreshRef.current = Date.now()
        }
      } catch (error) {
        // Solo log si el componente sigue montado
        if (isMountedRef.current) {
          console.warn('[Auth] Token refresh error:', error)
        }
      } finally {
        isRefreshingRef.current = false
      }
    }
  }, [supabase, tokenRefreshInterval, timeout])

  // Actualizar timestamp de actividad
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Si mostramos el warning, lo ocultamos porque el usuario ya interactuó
    if (warningShownRef.current) {
      warningShownRef.current = false
      toast.dismiss('idle-warning')
    }
  }, [])

  useEffect(() => {
    // Marcar como montado
    isMountedRef.current = true

    // Limpiar intervalo anterior si existe (protección contra re-renders)
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current)
      checkIntervalRef.current = null
    }

    if (!isAuthenticated) {
      return
    }

    // Inicializar timestamp
    lastActivityRef.current = Date.now()
    warningShownRef.current = false

    // Eventos que indican actividad (reducidos para menor overhead)
    const events = ['mousedown', 'keydown', 'touchstart', 'click'] as const

    // Throttling para no procesar cada evento
    let throttleTimer: NodeJS.Timeout | null = null
    let isThrottled = false

    const handleActivity = () => {
      if (isThrottled) return
      isThrottled = true
      updateActivity()
      throttleTimer = setTimeout(() => {
        isThrottled = false
      }, 2000) // Throttle a 2 segundos para reducir carga
    }

    // Agregar listeners con passive para mejor rendimiento
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Iniciar intervalo de chequeo cada 10 segundos (reducido de 5s)
    checkIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return

      const now = Date.now()
      const timeSinceLastActivity = now - lastActivityRef.current
      const timeUntilTimeout = timeout - timeSinceLastActivity

      // Caso 1: Se acabó el tiempo
      if (timeUntilTimeout <= 0) {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current)
          checkIntervalRef.current = null
        }
        handleLogout()
        return
      }

      // Caso 2: Estamos en rango de advertencia
      if (timeUntilTimeout <= promptBeforeIdle) {
        showWarning()
      }

      // Caso 3: Usuario activo - refrescar token si es necesario
      // No usar await para no bloquear el intervalo
      refreshTokenIfNeeded()
    }, 10000) // 10 segundos en lugar de 5

    // Cleanup
    return () => {
      isMountedRef.current = false

      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }

      if (throttleTimer) {
        clearTimeout(throttleTimer)
      }

      toast.dismiss('idle-warning')
    }
  }, [isAuthenticated, timeout, promptBeforeIdle, handleLogout, showWarning, updateActivity, refreshTokenIfNeeded])

  return {
    lastActivity: lastActivityRef.current,
    resetTimer: updateActivity,
  }
}
