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
        <Label className="text-base font-semibold">Opciones</Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="double-round"
            checked={isDoubleRound}
            onCheckedChange={(checked) => onDoubleRoundChange(Boolean(checked))}
          />
          <Label htmlFor="double-round" className="cursor-pointer font-normal">
            Ida y vuelta (doblete)
          </Label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Atrás
        </Button>
        <Button onClick={onNext}>Siguiente</Button>
      </div>
    </div>
  )
}
