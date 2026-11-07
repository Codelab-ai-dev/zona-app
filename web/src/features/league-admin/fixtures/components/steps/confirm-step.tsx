import { Button } from '@/components/ui/button'

interface ConfirmStepProps {
  tournamentName: string
  teamCount: number
  isDoubleRound: boolean
  startDate: string
  pending: boolean
  onBack: () => void
  onGenerate: () => void
}

/** Step 5: summary + generate. Rounds are only known after the API answers. */
export function ConfirmStep({
  tournamentName,
  teamCount,
  isDoubleRound,
  startDate,
  pending,
  onBack,
  onGenerate,
}: ConfirmStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium">
          <strong>Torneo:</strong> {tournamentName}
        </p>
        <p className="text-sm font-medium">
          <strong>Equipos:</strong> {teamCount}
        </p>
        <p className="text-sm font-medium">
          <strong>Formato:</strong> {isDoubleRound ? 'Ida y vuelta' : 'Solo ida'}
        </p>
        <p className="text-sm font-medium">
          <strong>Inicio:</strong> {startDate || 'Sin fecha'}
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={pending}>
          Atrás
        </Button>
        <Button onClick={onGenerate} disabled={pending} className="flex-1">
          {pending ? 'Generando…' : 'Generar Fixtures'}
        </Button>
      </div>
    </div>
  )
}
