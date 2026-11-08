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
      <div className="space-y-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <p className="text-sm font-medium text-blue-300">
          <strong>Torneo:</strong> {tournamentName}
        </p>
        <p className="text-sm font-medium text-blue-300">
          <strong>Equipos:</strong> {teamCount}
        </p>
        <p className="text-sm font-medium text-blue-300">
          <strong>Formato:</strong> {isDoubleRound ? 'Ida y vuelta' : 'Solo ida'}
        </p>
        <p className="text-sm font-medium text-blue-300">
          <strong>Inicio:</strong> {startDate || 'Sin fecha'}
        </p>
      </div>

      <div className="flex gap-2">
        <Button className="border-white/10 bg-slate-700/50 text-gray-400 hover:bg-slate-700 hover:text-white" onClick={onBack} disabled={pending}>
          Atrás
        </Button>
        <Button onClick={onGenerate} disabled={pending} className="flex-1 bg-green-500 text-white hover:bg-green-600">
          {pending ? 'Generando…' : 'Generar Fixtures'}
        </Button>
      </div>
    </div>
  )
}
