import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

import type { QRRunResult } from '../api'

/** Result of a QR run: counters, normalized names, failures and the final summary. */
export function QRResults({ result }: { result: QRRunResult }) {
  const success = result.updated
  const failed = result.failures.length
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <Badge className="flex items-center gap-2 border-green-500/30 bg-green-500/20 text-green-300 backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {success} Exitosos
        </Badge>
        {failed > 0 && (
          <Badge className="flex items-center gap-2 border-red-500/30 bg-red-500/20 text-red-300 backdrop-blur-md">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {failed} Fallidos
          </Badge>
        )}
      </div>

      {result.normalized.length > 0 && (
        <>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="flex gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" aria-hidden="true" />
              <div>
                <h4 className="text-sm font-medium text-blue-300">Nombres Normalizados</h4>
                <p className="mt-1 text-xs text-blue-300/80">
                  Se detectaron {result.normalized.length} jugadores con caracteres especiales (ñ, acentos) que fueron normalizados automáticamente para asegurar compatibilidad con el escáner QR.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white drop-shadow">
              <Info className="h-4 w-4 text-blue-400" aria-hidden="true" />
              Jugadores con nombres normalizados:
            </h3>
            <ul className="max-h-60 space-y-2 overflow-y-auto">
              {result.normalized.map((n) => (
                <li key={n.id} className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{n.name}</p>
                    <p className="text-xs text-blue-300/80">En QR: {n.inQR}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-400" aria-label="Actualizado" />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {failed > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white drop-shadow">
            <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
            Jugadores con errores:
          </h3>
          <ul className="max-h-60 space-y-2 overflow-y-auto">
            {result.failures.map((failure, i) => (
              <li key={`${failure.label}-${i}`} className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-sm font-medium text-white">{failure.label}</p>
                <p className="mt-1 text-xs text-red-300/80">{failure.error}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div role="status" className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" aria-hidden="true" />
          <div>
            <h4 className="text-sm font-medium text-green-300">Actualización Completada</h4>
            <p className="mt-1 text-xs text-green-300/80">
              {success === 0 && failed === 0
                ? 'No hay jugadores activos para actualizar en los equipos seleccionados.'
                : failed === 0
                  ? `¡Todos los ${success} códigos QR fueron regenerados exitosamente! Los jugadores ahora podrán escanear sus credenciales sin problemas.`
                  : `${success} códigos QR fueron regenerados exitosamente. ${failed} jugadores requieren atención manual.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
