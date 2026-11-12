import { Wallet } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const previews = [
  { title: 'Cuotas', description: 'Inscripción de equipos y jugadores', icon: '💰' },
  { title: 'Multas', description: 'Tarjetas, incomparecencias', icon: '🟨' },
  { title: 'Reportes', description: 'Estados de cuenta', icon: '📊' },
]

/** Shown when the league does not have the "finance" feature (the super admin toggles it). */
export function FinanceDisabled() {
  return (
    <section aria-labelledby="finance-title" className="space-y-6">
      <div className="mb-6">
        <h2 id="finance-title" className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
          Gestión Financiera
        </h2>
        <p className="text-white/80 drop-shadow">Control de cuotas, multas y pagos de la liga</p>
      </div>

      <Alert className="backdrop-blur-xl bg-amber-500/10 border-amber-500/30">
        <Wallet className="h-5 w-5 text-amber-400" aria-hidden="true" />
        <AlertTitle className="text-amber-200 font-semibold">Módulo no activado</AlertTitle>
        <AlertDescription className="text-amber-100/80 mt-2">
          <p className="mb-4">El módulo de Gestión Financiera permite administrar:</p>
          <ul className="list-disc list-inside space-y-1 mb-4 text-sm">
            <li>Cuotas de inscripción de equipos y jugadores</li>
            <li>Multas por tarjetas amarillas y rojas</li>
            <li>Multas por incomparecencia</li>
            <li>Estados de cuenta por equipo</li>
            <li>Reportes financieros</li>
            <li>Generación automática de multas</li>
          </ul>
          <p className="text-sm">Contacta al administrador del sistema para activar esta función.</p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {previews.map((item) => (
          <div key={item.title} className="p-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg opacity-50">
            <div className="text-3xl mb-3" aria-hidden="true">
              {item.icon}
            </div>
            <h3 className="font-semibold text-white/70">{item.title}</h3>
            <p className="text-sm text-white/50">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
