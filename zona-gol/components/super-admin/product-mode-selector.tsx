/**
 * ProductModeSelector Component
 *
 * UI for selecting product mode when creating/editing leagues
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import {
  ProductMode,
  PRODUCT_MODE_CONFIG,
  FEATURE_LABELS,
  type LeagueFeatures,
} from '@/lib/types/product-mode'

interface ProductModeSelectorProps {
  value: ProductMode
  onChange: (mode: ProductMode) => void
  disabled?: boolean
}

export function ProductModeSelector({
  value,
  onChange,
  disabled = false,
}: ProductModeSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-medium text-white drop-shadow-lg mb-1">Tipo de Producto</h4>
        <p className="text-sm text-white/70 drop-shadow">
          Selecciona el plan para esta liga
        </p>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ProductMode)}
        disabled={disabled}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {(Object.keys(PRODUCT_MODE_CONFIG) as ProductMode[]).map((mode) => {
          const config = PRODUCT_MODE_CONFIG[mode]
          const isSelected = value === mode

          return (
            <div
              key={mode}
              className={`relative cursor-pointer transition-all rounded-xl backdrop-blur-md ${
                isSelected
                  ? 'bg-white/20 border-2 border-white/50 shadow-lg ring-2 ring-white/30'
                  : 'bg-white/10 border border-white/20 hover:bg-white/15'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onChange(mode)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <h5 className="font-semibold text-white drop-shadow">{config.label}</h5>
                      <Badge
                        variant={mode === 'full' ? 'default' : 'secondary'}
                        className="mt-0.5 text-xs backdrop-blur-md bg-white/20 border-white/30 text-white"
                      >
                        {config.price}
                      </Badge>
                    </div>
                  </div>
                  <RadioGroupItem value={mode} id={mode} className="border-white/50 text-white" />
                </div>

                <p className="text-xs text-white/80 drop-shadow mb-3">
                  {config.description}
                </p>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-white/70">Incluye:</p>
                  <ul className="space-y-1">
                    {(Object.keys(config.features) as (keyof LeagueFeatures)[])
                      .filter((feature) => config.features[feature])
                      .slice(0, 4) // Solo mostrar primeras 4 features para no saturar
                      .map((feature) => (
                        <li key={feature} className="flex items-center gap-1.5 text-xs text-white/90">
                          <Check className="h-3 w-3 text-green-300 flex-shrink-0" />
                          <span>{FEATURE_LABELS[feature]}</span>
                        </li>
                      ))}
                    {Object.keys(config.features).filter((k) => config.features[k as keyof LeagueFeatures]).length > 4 && (
                      <li className="text-xs text-white/60 pl-5">
                        +{Object.keys(config.features).filter((k) => config.features[k as keyof LeagueFeatures]).length - 4} más...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
}

/**
 * ProductModeFeatureList Component
 *
 * Display feature comparison for both modes
 */
export function ProductModeFeatureComparison() {
  const allFeatures = Object.keys(FEATURE_LABELS) as (keyof LeagueFeatures)[]

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-4 font-medium">Función</th>
            <th className="text-center p-4 font-medium">
              {PRODUCT_MODE_CONFIG.web_only.icon} Web
            </th>
            <th className="text-center p-4 font-medium">
              {PRODUCT_MODE_CONFIG.full.icon} Completo
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {allFeatures.map((feature) => (
            <tr key={feature} className="hover:bg-muted/50">
              <td className="p-4">
                <div className="font-medium">{FEATURE_LABELS[feature]}</div>
              </td>
              <td className="p-4 text-center">
                {PRODUCT_MODE_CONFIG.web_only.features[feature] ? (
                  <Check className="h-5 w-5 text-green-600 mx-auto" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="p-4 text-center">
                {PRODUCT_MODE_CONFIG.full.features[feature] ? (
                  <Check className="h-5 w-5 text-green-600 mx-auto" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
