/**
 * FeatureGate Component
 *
 * Conditionally renders children based on league features
 */

'use client'

import { ReactNode } from 'react'
import { useLeagueFeatures } from '@/lib/hooks/use-league-features'
import type { LeagueFeatures } from '@/lib/types/product-mode'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Lock } from 'lucide-react'

interface FeatureGateProps {
  leagueId: string
  feature: keyof LeagueFeatures
  children: ReactNode
  fallback?: ReactNode
  showUpgradeMessage?: boolean
}

export function FeatureGate({
  leagueId,
  feature,
  children,
  fallback,
  showUpgradeMessage = true,
}: FeatureGateProps) {
  const { hasFeature, loading, productMode } = useLeagueFeatures(leagueId)

  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded-md h-32" />
  }

  const isEnabled = hasFeature(feature)

  if (isEnabled) {
    return <>{children}</>
  }

  // Feature not enabled
  if (fallback) {
    return <>{fallback}</>
  }

  if (showUpgradeMessage) {
    return (
      <Alert variant="default" className="border-amber-200 bg-amber-50">
        <Lock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">Función no disponible</AlertTitle>
        <AlertDescription className="text-amber-700">
          Esta función requiere el plan <strong>Zona-G Completo</strong>.
          {productMode === 'web_only' && (
            <> Actualmente estás usando el plan <strong>Zona-G Web</strong>.</>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

/**
 * FeatureGateMultiple Component
 *
 * Requires ALL specified features to be enabled
 */
interface FeatureGateMultipleProps {
  leagueId: string
  features: (keyof LeagueFeatures)[]
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean // true = AND, false = OR
}

export function FeatureGateMultiple({
  leagueId,
  features,
  children,
  fallback,
  requireAll = true,
}: FeatureGateMultipleProps) {
  const { hasFeature, loading } = useLeagueFeatures(leagueId)

  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded-md h-32" />
  }

  const isEnabled = requireAll
    ? features.every((f) => hasFeature(f))
    : features.some((f) => hasFeature(f))

  if (isEnabled) {
    return <>{children}</>
  }

  return fallback ? <>{fallback}</> : null
}

/**
 * useFeatureGate Hook
 *
 * Programmatic feature checking
 */
export function useFeatureGate(leagueId: string, feature: keyof LeagueFeatures) {
  const { hasFeature, loading, productMode } = useLeagueFeatures(leagueId)

  return {
    isEnabled: hasFeature(feature),
    loading,
    productMode,
  }
}
