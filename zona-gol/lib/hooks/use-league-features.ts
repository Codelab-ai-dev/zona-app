/**
 * useLeagueFeatures Hook
 *
 * React hook to check if a league has specific features enabled
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
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

export function useLeagueFeatures(leagueId: string | undefined): UseLeagueFeaturesReturn {
  const [productMode, setProductMode] = useState<ProductMode | null>(null)
  const [features, setFeatures] = useState<LeagueFeatures | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = useMemo(() => createClientSupabaseClient(), [])

  const fetchLeagueFeatures = useCallback(async () => {
    if (!leagueId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Fetching league features for:', leagueId)

      const { data, error: fetchError } = await supabase
        .from('leagues')
        .select('product_mode, features')
        .eq('id', leagueId)
        .single()

      if (fetchError) {
        console.error('❌ Error fetching league features:', fetchError)
        throw fetchError
      }

      console.log('✅ League features loaded:', data)

      setProductMode(data.product_mode as ProductMode)
      setFeatures(data.features as LeagueFeatures)
    } catch (err) {
      console.error('❌ Error in fetchLeagueFeatures:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
      // Set defaults on error to prevent infinite loading
      setProductMode('full')
      setFeatures(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId, supabase])

  useEffect(() => {
    fetchLeagueFeatures()
  }, [fetchLeagueFeatures])

  const hasFeature = (featureName: keyof LeagueFeatures): boolean => {
    if (!features) return false
    return features[featureName] === true
  }

  return {
    productMode,
    features,
    loading,
    error,
    hasFeature,
    refresh: fetchLeagueFeatures,
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
