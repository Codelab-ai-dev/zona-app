import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useUpdateLeagueProductMode } from '../api'
import type { League } from '../types'
import { ApiError } from '@/lib/api/client'

const FEATURE_GROUPS = {
  core: {
    label: 'Funciones Principales',
    features: ['manual_entry', 'public_portal', 'statistics'] as const,
  },
  mobile: {
    label: 'Móvil y Tiempo Real',
    features: ['qr_codes', 'facial_recognition', 'mobile_app', 'realtime_updates'] as const,
  },
  finance: {
    label: 'Gestión Financiera',
    features: ['finance', 'finance_auto_fines', 'finance_payments'] as const,
  },
  ai: {
    label: 'Inteligencia Artificial',
    features: ['ai_agent'] as const,
  },
}

const FEATURE_LABELS: Record<string, string> = {
  manual_entry: 'Entrada Manual',
  public_portal: 'Portal Público',
  statistics: 'Estadísticas',
  qr_codes: 'Códigos QR',
  facial_recognition: 'Reconocimiento Facial',
  mobile_app: 'Aplicación Móvil',
  realtime_updates: 'Actualizaciones en Tiempo Real',
  finance: 'Finanzas',
  finance_auto_fines: 'Multas Automáticas',
  finance_payments: 'Pagos',
  ai_agent: 'Agente IA',
}

interface LeagueFeaturesEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  league: League | null
}

export function LeagueFeaturesEditor({ open, onOpenChange, league }: LeagueFeaturesEditorProps) {
  const updateMode = useUpdateLeagueProductMode()

  const [features, setFeatures] = useState<Record<string, boolean>>(league?.features || {})

  const handleToggle = (feature: string, enabled: boolean) => {
    setFeatures((prev) => ({
      ...prev,
      [feature]: enabled,
    }))

    // If disabling finance, also disable sub-features
    if (feature === 'finance' && !enabled) {
      setFeatures((prev) => ({
        ...prev,
        finance: false,
        finance_auto_fines: false,
        finance_payments: false,
      }))
    }
  }

  const handleSave = async () => {
    if (!league) return

    try {
      await updateMode.mutateAsync({
        id: league.id,
        data: {
          product_mode: league.product_mode,
          features,
        },
      })
      toast.success('Features actualizadas exitosamente')
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Error al actualizar features')
      }
    }
  }

  if (!league) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Features</DialogTitle>
          <DialogDescription>{league.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(FEATURE_GROUPS).map(([groupKey, group]) => (
            <div key={groupKey} className="space-y-3">
              <h3 className="text-sm font-medium">{group.label}</h3>
              <div className="space-y-2 pl-4">
                {group.features.map((feature) => {
                  const isEnabled = features[feature] ?? false
                  const isFinanceSubFeature = feature === 'finance_auto_fines' || feature === 'finance_payments'
                  const isDisabled = isFinanceSubFeature && !features.finance

                  return (
                    <div
                      key={feature}
                      className="flex items-center justify-between p-2 rounded border"
                      style={{
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                    >
                      <Label className="text-sm cursor-pointer flex-1">{FEATURE_LABELS[feature]}</Label>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggle(feature, checked)}
                        disabled={isDisabled}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMode.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateMode.isPending}>
            {updateMode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
