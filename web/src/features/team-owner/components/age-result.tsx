import { CheckCircle, XCircle } from 'lucide-react'

import { describeAgeRules, type AgeResult, type AgeRules } from '../age-rules'

/** Age rules of the tournament, shown under the birth date field. */
export function AgeRulesText({ rules, available }: { rules: AgeRules; available: number }) {
  return (
    <div className="mt-1">
      <p className="text-xs text-white/70">{describeAgeRules(rules)}</p>
      {rules.enabled && available > 0 && <p className="text-xs text-yellow-300 mt-1">Excepciones disponibles: {available}</p>}
    </div>
  )
}

/** Live result of the age check for the typed birth date. */
export function AgeResultBox({ result }: { result: AgeResult }) {
  const tone = !result.isValid
    ? ['bg-red-500/20 border-red-400/30', 'text-red-300', 'No cumple requisitos']
    : result.isException
      ? ['bg-yellow-500/20 border-yellow-400/30', 'text-yellow-300', 'Válido como excepción']
      : ['bg-green-500/20 border-green-400/30', 'text-green-300', 'Cumple requisitos']
  const Icon = result.isValid ? CheckCircle : XCircle
  return (
    <div className={`p-3 rounded-lg border ${tone[0]}`} role="status">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${tone[1]}`} aria-hidden="true" />
        <span className={`text-sm font-medium ${tone[1]}`}>
          {result.age} años - {tone[2]}
        </span>
      </div>
      {result.reason && <p className="text-xs mt-1 text-white/70">{result.reason}</p>}
    </div>
  )
}
