import { AlertCircle, Lock } from 'lucide-react'

/** "Registro de Jugadores Cerrado" banner of the original Jugadores tab. */
export function RegistrationClosedBanner() {
  return (
    <div className="border-2 border-red-400/50 rounded-xl p-4 backdrop-blur-xl bg-red-500/20 shadow-xl">
      <div className="flex items-start">
        <Lock className="w-6 h-6 mr-3 mt-0.5 text-red-300 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="font-bold text-white drop-shadow-lg text-base sm:text-lg">Registro de Jugadores Cerrado</h3>
          <p className="text-sm mt-2 text-white/90 drop-shadow">
            La liga ha cerrado el periodo de registro de jugadores para este torneo. Si necesitas registrar un jugador debido a una
            lesión u otra circunstancia excepcional, puedes solicitar una aprobación especial más abajo.
          </p>
        </div>
      </div>
    </div>
  )
}

interface LimitBannerProps {
  /** "jugadores" / "cuerpo técnico". */
  title: string
  /** Sentence of the at-limit state, e.g. "Has registrado el máximo de 5 jugadores permitidos para este torneo." */
  atLimitText: string
  used: number
  max: number
  noun: string
}

/** "Límite de jugadores / N espacios disponibles" banner. */
export function LimitBanner({ title, atLimitText, used, max, noun }: LimitBannerProps) {
  const remaining = max - used
  const atLimit = remaining <= 0
  return (
    <div className={`border rounded-xl p-4 backdrop-blur-xl shadow-xl ${atLimit ? 'bg-red-500/20 border-red-400/50' : 'bg-blue-500/20 border-blue-400/50'}`}>
      <div className="flex items-start">
        <AlertCircle className={`w-5 h-5 mr-3 mt-0.5 ${atLimit ? 'text-red-300' : 'text-blue-300'}`} aria-hidden="true" />
        <div className="flex-1">
          <h3 className="font-semibold text-white drop-shadow-lg">{atLimit ? `${title} alcanzado` : title}</h3>
          <p className="text-sm mt-1 text-white/90 drop-shadow">
            {atLimit
              ? atLimitText
              : `Tienes ${remaining} ${remaining === 1 ? 'espacio disponible' : 'espacios disponibles'} de ${max} ${noun} permitidos.`}
          </p>
        </div>
      </div>
    </div>
  )
}
