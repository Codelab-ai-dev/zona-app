/**
 * ProductModeSelector Component
 *
 * UI for selecting product mode when creating/editing leagues
 */

'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
        <h4 className="font-medium text-white text-sm mb-1">Tipo de Producto</h4>
        <p className="text-xs text-gray-500">
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
              className={`relative cursor-pointer transition-all rounded-xl ${
                isSelected
                  ? 'bg-green-500/20 border-2 border-green-500/50 ring-1 ring-green-500/30'
                  : 'bg-slate-700/30 border border-white/10 hover:bg-slate-700/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onChange(mode)}
            >
              <div className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl md:text-2xl">{config.icon}</span>
                    <div>
                      <h5 className="font-semibold text-white text-sm">{config.label}</h5>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                          mode === 'full'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {config.price}
                      </span>
                    </div>
                  </div>
                  <RadioGroupItem
                    value={mode}
                    id={mode}
                    className="border-white/30 text-green-400 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                </div>

                <p className="text-[10px] md:text-xs text-gray-500 mb-2">
                  {config.description}
                </p>

                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-gray-500">Incluye:</p>
                  <ul className="space-y-0.5">
                    {(Object.keys(config.features) as (keyof LeagueFeatures)[])
                      .filter((feature) => config.features[feature])
                      .slice(0, 4) // Solo mostrar primeras 4 features para no saturar
                      .map((feature) => (
                        <li key={feature} className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-400">
                          <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                          <span>{FEATURE_LABELS[feature]}</span>
                        </li>
                      ))}
                    {Object.keys(config.features).filter((k) => config.features[k as keyof LeagueFeatures]).length > 4 && (
                      <li className="text-[10px] text-gray-600 pl-4">
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
    <div className="rounded-xl bg-slate-800/50 border border-white/10 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-700/50">
          <tr>
            <th className="text-left p-3 md:p-4 font-medium text-white text-sm">Función</th>
            <th className="text-center p-3 md:p-4 font-medium text-white text-sm">
              {PRODUCT_MODE_CONFIG.web_only.icon} Web
            </th>
            <th className="text-center p-3 md:p-4 font-medium text-white text-sm">
              {PRODUCT_MODE_CONFIG.full.icon} Completo
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {allFeatures.map((feature) => (
            <tr key={feature} className="hover:bg-slate-700/30">
              <td className="p-3 md:p-4">
                <div className="font-medium text-gray-300 text-sm">{FEATURE_LABELS[feature]}</div>
              </td>
              <td className="p-3 md:p-4 text-center">
                {PRODUCT_MODE_CONFIG.web_only.features[feature] ? (
                  <Check className="w-4 h-4 md:w-5 md:h-5 text-green-400 mx-auto" />
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
              <td className="p-3 md:p-4 text-center">
                {PRODUCT_MODE_CONFIG.full.features[feature] ? (
                  <Check className="w-4 h-4 md:w-5 md:h-5 text-green-400 mx-auto" />
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
