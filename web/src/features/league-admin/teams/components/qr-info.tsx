import { Info, Users } from 'lucide-react'

/** Static explanations of the QR batch screen (copied from the original app). */
export function QRInfo() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
        <h4 className="mb-3 flex items-center gap-2 font-semibold text-white">
          <Users className="h-4 w-4 text-blue-300" aria-hidden="true" />
          ¿Qué hace esta función?
        </h4>
        <ul className="ml-2 list-inside list-disc space-y-1 text-sm text-white/70">
          <li>Encuentra todos los jugadores activos de los equipos seleccionados</li>
          <li>Regenera el código QR de cada jugador con el formato correcto</li>
          <li>Incluye: ID, nombre, equipo, número de camiseta y liga</li>
          <li><strong className="text-white">Normaliza nombres con ñ, acentos y caracteres especiales</strong></li>
          <li>Muestra un reporte detallado de los resultados</li>
        </ul>
      </div>
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" aria-hidden="true" />
          <div className="space-y-2 text-xs">
            <h4 className="text-sm font-medium text-blue-300">Normalización de Caracteres Especiales</h4>
            <p className="text-blue-300/80">
              Para asegurar compatibilidad con los escáneres QR, los nombres con caracteres especiales se normalizan automáticamente:
            </p>
            <ul className="ml-2 list-inside list-disc text-blue-300/80">
              <li>Acentos: á→a, é→e, í→i, ó→o, ú→u</li>
              <li>Eñe: ñ→n</li>
              <li>Otros: ü→u, ç→c</li>
            </ul>
            <p className="mt-2 text-blue-300/80">
              <strong className="text-blue-300">Importante:</strong> El nombre original del jugador NO cambia en la base de datos. Solo se normaliza dentro del código QR para evitar errores de escaneo.
            </p>
          </div>
        </div>
      </div>
      <p className="text-xs text-white/50">
        <strong className="text-white/70">Nota:</strong> Esta operación no modifica los datos de los jugadores, solo regenera los códigos QR con toda la información necesaria para que la app móvil los pueda escanear correctamente.
      </p>
    </div>
  )
}
