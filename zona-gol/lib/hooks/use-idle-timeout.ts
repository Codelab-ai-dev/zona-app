"use client"

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './use-auth'
import { toast } from 'sonner'
import { authConfig } from '../config/auth-config'

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

  // Usamos ref para el timestamp de última actividad para evitar re-renders
  const lastActivityRef = useRef<number>(Date.now())

  // Para controlar si ya mostramos el warning y evitar múltiples toasts
  const warningShownRef = useRef<boolean>(false)

  // Intervalo de chequeo
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
    if (!isAuthenticated) {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
      return
    }

    // Inicializar timestamp
    lastActivityRef.current = Date.now()
    warningShownRef.current = false

    // Eventos que indican actividad
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ]

    // Throttling básico para no actualizar en cada pixel de movimiento de mouse
    let throttleTimer: NodeJS.Timeout | null = null

    const handleActivity = () => {
      if (!throttleTimer) {
        updateActivity()
        throttleTimer = setTimeout(() => {
          throttleTimer = null
        }, 1000) // Solo actualizar máximo 1 vez por segundo
      }
    }

    // Agregar listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity)
    })

    // Iniciar intervalo de chequeo
    // Chequeamos cada 5 segundos
    checkIntervalRef.current = setInterval(() => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivityRef.current
      const timeUntilTimeout = timeout - timeSinceLastActivity

      // Caso 1: Se acabó el tiempo
      if (timeUntilTimeout <= 0) {
        if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
        handleLogout()
        return
      }

      // Caso 2: Estamos en rango de advertencia
      if (timeUntilTimeout <= promptBeforeIdle) {
        showWarning()
      }

    }, 5000)

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }

      if (throttleTimer) {
        clearTimeout(throttleTimer)
      }

      toast.dismiss('idle-warning')
    }
  }, [isAuthenticated, timeout, promptBeforeIdle, handleLogout, showWarning, updateActivity])

  return {
    lastActivity: lastActivityRef.current,
    resetTimer: updateActivity,
  }
}
