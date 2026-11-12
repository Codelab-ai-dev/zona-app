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
      <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-center">
        <p className="font-semibold text-green-400">¡Fixtures generados correctamente!</p>
        <p className="text-sm text-gray-500">
          Se generaron {matches} partidos en {rounds} jornadas.
        </p>
      </div>
      <Button onClick={onDone} className="w-full bg-green-500 text-white hover:bg-green-600">
        Listo
      </Button>
    </div>
  )
}
