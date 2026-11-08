import { Check } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FEATURE_KEYS, type FeatureKey, type ProductMode } from '../types'
import { PRODUCT_FEATURE_LABELS, PRODUCT_MODE_CONFIG } from './product-mode-config'

const MODES = Object.keys(PRODUCT_MODE_CONFIG) as ProductMode[]
const includedOf = (mode: ProductMode) => FEATURE_KEYS.filter((f: FeatureKey) => PRODUCT_MODE_CONFIG[mode].features[f])

interface ProductModeSelectorProps {
  value: ProductMode
  onChange: (mode: ProductMode) => void
  disabled?: boolean
}

/** Plan cards (Incluye list) plus the Función comparison table, like the original. */
export function ProductModeSelector({ value, onChange, disabled = false }: ProductModeSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-medium text-white text-sm mb-1">Tipo de Producto</h4>
        <p className="text-xs text-gray-500">Selecciona el plan para esta liga</p>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ProductMode)}
        disabled={disabled}
        aria-label="Tipo de producto"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {MODES.map((mode) => {
          const config = PRODUCT_MODE_CONFIG[mode]
          const included = includedOf(mode)
          const isSelected = value === mode
          return (
            <div
              key={mode}
              role="presentation"
              onClick={() => !disabled && onChange(mode)}
              className={`relative block cursor-pointer transition-all rounded-xl ${
                isSelected
                  ? 'bg-green-500/20 border-2 border-green-500/50 ring-1 ring-green-500/30'
                  : 'bg-slate-700/30 border border-white/10 hover:bg-slate-700/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl md:text-2xl" aria-hidden="true">{config.icon}</span>
                    <div>
                      <span className="block font-semibold text-white text-sm">{config.label}</span>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                          mode === 'full' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {config.price}
                      </span>
                    </div>
                  </div>
                  <RadioGroupItem
                    value={mode}
                    id={`product-mode-${mode}`}
                    aria-label={config.label}
                    className="border-white/30 text-green-400 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                </div>
                <p className="text-[10px] md:text-xs text-gray-500 mb-2">{config.description}</p>
                <p className="text-[10px] font-medium text-gray-500">Incluye:</p>
                <ul className="space-y-0.5">
                  {included.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-400">
                      <Check className="w-3 h-3 text-green-400 flex-shrink-0" aria-hidden="true" />
                      <span>{PRODUCT_FEATURE_LABELS[feature]}</span>
                    </li>
                  ))}
                  {included.length > 4 && <li className="text-[10px] text-gray-600 pl-4">+{included.length - 4} más...</li>}
                </ul>
              </div>
            </div>
          )
        })}
      </RadioGroup>

      <details className="rounded-xl bg-slate-800/50 border border-white/10 overflow-hidden">
        <summary className="cursor-pointer p-3 text-xs text-gray-400 hover:text-white">Comparar planes</summary>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th scope="col" className="text-left p-2 md:p-3 font-medium text-white text-xs">Función</th>
                {(['web_only', 'full'] as const).map((mode) => (
                  <th key={mode} scope="col" className="text-center p-2 md:p-3 font-medium text-white text-xs">
                    <span aria-hidden="true">{PRODUCT_MODE_CONFIG[mode].icon} </span>
                    {mode === 'full' ? 'Completo' : 'Web'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {FEATURE_KEYS.map((feature) => (
                <tr key={feature}>
                  <th scope="row" className="p-2 md:p-3 text-left font-medium text-gray-300 text-xs">{PRODUCT_FEATURE_LABELS[feature]}</th>
                  {(['web_only', 'full'] as const).map((mode) => (
                    <td key={mode} className="p-2 md:p-3 text-center">
                      {PRODUCT_MODE_CONFIG[mode].features[feature] ? (
                        <>
                          <Check className="w-4 h-4 text-green-400 mx-auto" aria-hidden="true" />
                          <span className="sr-only">Incluido</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-600" aria-hidden="true">—</span>
                          <span className="sr-only">No incluido</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
