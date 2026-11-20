import { Button } from '@/components/ui/button'

interface SuccessStepProps {
  rounds: number
  matches: number
  onDone: () => void
}

/** Final view: shown with the numbers the API returned. */
export function SuccessStep({ rounds, matches, onDone }: SuccessStepProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
        <p className="font-semibold text-emerald-400">¡Fixtures generados correctamente!</p>
        <p className="text-sm text-gray-500">
          Se generaron {matches} partidos en {rounds} jornadas.
        </p>
      </div>
      <Button onClick={onDone} className="w-full bg-gol-400 text-slate-950 hover:bg-gol-300">
        Listo
      </Button>
    </div>
  )
}
