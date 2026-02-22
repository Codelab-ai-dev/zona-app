/**
 * useLeagueFeatures Hook
 *
 * React hook to check if a league has specific features enabled
 * Optimizado con caché para evitar requests duplicados
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import type { LeagueFeatures, ProductMode } from '@/lib/types/product-mode'

interface UseLeagueFeaturesReturn {
  productMode: ProductMode | null
  features: LeagueFeatures | null
  loading: boolean
  error: Error | null
  hasFeature: (featureName: keyof LeagueFeatures) => boolean
  refresh: () => Promise<void>
}

// Caché global para evitar múltiples requests del mismo leagueId
const featuresCache = new Map<string, {
  productMode: ProductMode | null
  features: LeagueFeatures | null
  timestamp: number
}>()

// Promesas en vuelo para evitar requests duplicados simultáneos
const pendingRequests = new Map<string, Promise<{ productMode: ProductMode | null; features: LeagueFeatures | null }>>()

const CACHE_TTL = 5 * 60 * 1000 // 5 minutos de caché

export function useLeagueFeatures(leagueId: string | undefined): UseLeagueFeaturesReturn {
  const [productMode, setProductMode] = useState<ProductMode | null>(() => {
    if (!leagueId) return null
    const cached = featuresCache.get(leagueId)
    return cached ? cached.productMode : null
  })
  const [features, setFeatures] = useState<LeagueFeatures | null>(() => {
    if (!leagueId) return null
    const cached = featuresCache.get(leagueId)
    return cached ? cached.features : null
  })
  const [loading, setLoading] = useState(() => {
    if (!leagueId) return false
    const cached = featuresCache.get(leagueId)
    return !cached || (Date.now() - cached.timestamp > CACHE_TTL)
  })
  const [error, setError] = useState<Error | null>(null)

  // Ref para evitar actualizaciones en componentes desmontados
  const isMountedRef = useRef(true)
  const lastLeagueIdRef = useRef<string | undefined>(undefined)

  const fetchLeagueFeatures = useCallback(async (forceRefresh = false) => {
    if (!leagueId) {
      setLoading(false)
      return
    }

    // Verificar caché
    const cached = featuresCache.get(leagueId)
    const isCacheValid = cached && (Date.now() - cached.timestamp < CACHE_TTL)

    if (isCacheValid && !forceRefresh) {
      if (isMountedRef.current) {
        setProductMode(cached.productMode)
        setFeatures(cached.features)
        setLoading(false)
      }
      return
    }

    // Si hay una request en vuelo para este leagueId, esperarla
    const pendingRequest = pendingRequests.get(leagueId)
    if (pendingRequest && !forceRefresh) {
      try {
        const result = await pendingRequest
        if (isMountedRef.current) {
          setProductMode(result.productMode)
          setFeatures(result.features)
          setLoading(false)
        }
      } catch {
        // El error ya se manejó en la request original
      }
      return
    }

    // Crear nueva request
    const requestPromise = (async () => {
      const supabase = createClientSupabaseClient()
      const { data, error: fetchError } = await supabase
        .from('leagues')
        .select('product_mode, features')
        .eq('id', leagueId)
        .single()

      if (fetchError) throw fetchError

      return {
        productMode: data.product_mode as ProductMode,
        features: data.features as LeagueFeatures
      }
    })()

    pendingRequests.set(leagueId, requestPromise)

    try {
      if (isMountedRef.current) {
        setLoading(true)
        setError(null)
      }

      const result = await requestPromise

      // Guardar en caché
      featuresCache.set(leagueId, {
        ...result,
        timestamp: Date.now()
      })

      if (isMountedRef.current) {
        setProductMode(result.productMode)
        setFeatures(result.features)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setProductMode('full')
        setFeatures(null)
      }
    } finally {
      pendingRequests.delete(leagueId)
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [leagueId])

  useEffect(() => {
    isMountedRef.current = true

    // Solo fetch si el leagueId cambió
    if (lastLeagueIdRef.current !== leagueId) {
      lastLeagueIdRef.current = leagueId
      fetchLeagueFeatures()
    }

    return () => {
      isMountedRef.current = false
    }
  }, [leagueId, fetchLeagueFeatures])

  const hasFeature = useCallback((featureName: keyof LeagueFeatures): boolean => {
    if (!features) return false
    return features[featureName] === true
  }, [features])

  const refresh = useCallback(() => fetchLeagueFeatures(true), [fetchLeagueFeatures])

  return {
    productMode,
    features,
    loading,
    error,
    hasFeature,
    refresh,
  }
}

/**
 * useCurrentLeagueFeatures Hook
 *
 * Gets features for the currently selected league (from context/state)
 */
export function useCurrentLeagueFeatures(): UseLeagueFeaturesReturn {
  // TODO: Replace with your actual league context/state management
  // For now, return a placeholder that gets leagueId from URL or context
  const leagueId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('leagueId') || undefined
    : undefined

  return useLeagueFeatures(leagueId)
}
