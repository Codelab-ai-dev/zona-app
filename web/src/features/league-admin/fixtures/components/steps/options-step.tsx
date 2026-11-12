import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface OptionsStepProps {
  isDoubleRound: boolean
  onDoubleRoundChange: (value: boolean) => void
  onBack: () => void
  onNext: () => void
}

/** Step 4: generation options. */
export function OptionsStep({ isDoubleRound, onDoubleRoundChange, onBack, onNext }: OptionsStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="mb-1.5 block text-xs font-medium text-gray-400 md:text-sm">Opciones</Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="double-round"
            checked={isDoubleRound}
            onCheckedChange={(checked) => onDoubleRoundChange(Boolean(checked))}
          />
          <Label htmlFor="double-round" className="cursor-pointer font-normal text-gray-300">
            Ida y vuelta (doblete)
          </Label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button className="border-white/10 bg-slate-700/50 text-gray-400 hover:bg-slate-700 hover:text-white" onClick={onBack}>
          Atrás
        </Button>
        <Button className="bg-green-500 text-white hover:bg-green-600" onClick={onNext}>Siguiente</Button>
      </div>
    </div>
  )
}
