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
      <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-center">
        <p className="font-semibold text-success">¡Fixtures generados correctamente!</p>
        <p className="text-sm text-muted-foreground">
          Se generaron {matches} partidos en {rounds} jornadas.
        </p>
      </div>
      <Button onClick={onDone} className="w-full">
        Listo
      </Button>
    </div>
  )
}
