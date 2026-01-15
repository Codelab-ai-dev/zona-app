"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Settings, Wallet, Zap, Bell, Shield } from "lucide-react"
import { toast } from "sonner"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import {
  FEATURE_LABELS,
  FEATURE_DESCRIPTIONS,
  type LeagueFeatures,
} from "@/lib/types/product-mode"

interface LeagueFeaturesEditorProps {
  leagueId: string
  leagueName: string
  currentFeatures: LeagueFeatures
  onUpdate?: () => void
}

// Group features by category
const FEATURE_GROUPS = {
  core: {
    label: "Funciones Principales",
    icon: Shield,
    features: ["manual_entry", "public_portal", "statistics"] as const,
  },
  mobile: {
    label: "Móvil y Tiempo Real",
    icon: Zap,
    features: ["qr_codes", "facial_recognition", "mobile_app", "realtime_updates"] as const,
  },
  finance: {
    label: "Gestión Financiera",
    icon: Wallet,
    features: ["finance", "finance_auto_fines", "finance_payments"] as const,
  },
  ai: {
    label: "Inteligencia Artificial",
    icon: Bell,
    features: ["ai_agent"] as const,
  },
}

export function LeagueFeaturesEditor({
  leagueId,
  leagueName,
  currentFeatures,
  onUpdate,
}: LeagueFeaturesEditorProps) {
  const [features, setFeatures] = useState<LeagueFeatures>(currentFeatures)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleFeatureToggle = (feature: keyof LeagueFeatures, enabled: boolean) => {
    setFeatures((prev) => ({
      ...prev,
      [feature]: enabled,
    }))
    setHasChanges(true)

    // If disabling finance, also disable sub-features
    if (feature === "finance" && !enabled) {
      setFeatures((prev) => ({
        ...prev,
        finance: false,
        finance_auto_fines: false,
        finance_payments: false,
      }))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from("leagues")
        .update({
          features: features as unknown as Record<string, boolean>,
          mode_updated_at: new Date().toISOString(),
        })
        .eq("id", leagueId)

      if (error) throw error

      toast.success("Features actualizadas exitosamente")
      setHasChanges(false)
      onUpdate?.()
    } catch (error) {
      console.error("Error updating features:", error)
      toast.error("Error al actualizar las features")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setFeatures(currentFeatures)
    setHasChanges(false)
  }

  return (
    <Card className="bg-slate-800/50 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Settings className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-white">Configurar Features</CardTitle>
              <CardDescription className="text-white/60">
                {leagueName}
              </CardDescription>
            </div>
          </div>
          {hasChanges && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Cambios sin guardar
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {Object.entries(FEATURE_GROUPS).map(([groupKey, group]) => {
          const Icon = group.icon
          return (
            <div key={groupKey} className="space-y-3">
              <div className="flex items-center gap-2 text-white/70">
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{group.label}</span>
              </div>

              <div className="space-y-2 pl-6">
                {group.features.map((feature) => {
                  const isEnabled = features[feature]
                  const isFinanceSubFeature =
                    feature === "finance_auto_fines" || feature === "finance_payments"
                  const isDisabled = isFinanceSubFeature && !features.finance

                  return (
                    <div
                      key={feature}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isEnabled
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-white/5 border-white/10"
                      } ${isDisabled ? "opacity-50" : ""}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {FEATURE_LABELS[feature]}
                        </p>
                        <p className="text-xs text-white/50">
                          {FEATURE_DESCRIPTIONS[feature]}
                        </p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          handleFeatureToggle(feature, checked)
                        }
                        disabled={isDisabled}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Actions */}
        {hasChanges && (
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Quick toggle for a single feature (for inline use)
 */
interface QuickFeatureToggleProps {
  leagueId: string
  feature: keyof LeagueFeatures
  enabled: boolean
  onToggle?: (enabled: boolean) => void
}

export function QuickFeatureToggle({
  leagueId,
  feature,
  enabled,
  onToggle,
}: QuickFeatureToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEnabled, setIsEnabled] = useState(enabled)

  const handleToggle = async (newValue: boolean) => {
    setIsUpdating(true)

    try {
      const supabase = createClientSupabaseClient()

      // Get current features
      const { data: league, error: fetchError } = await supabase
        .from("leagues")
        .select("features")
        .eq("id", leagueId)
        .single()

      if (fetchError) throw fetchError

      const currentFeatures = (league?.features || {}) as Record<string, boolean>
      const updatedFeatures = {
        ...currentFeatures,
        [feature]: newValue,
      }

      // If enabling finance sub-feature, ensure finance is enabled
      if ((feature === "finance_auto_fines" || feature === "finance_payments") && newValue) {
        updatedFeatures.finance = true
      }

      // If disabling finance, disable sub-features
      if (feature === "finance" && !newValue) {
        updatedFeatures.finance_auto_fines = false
        updatedFeatures.finance_payments = false
      }

      const { error: updateError } = await supabase
        .from("leagues")
        .update({
          features: updatedFeatures,
          mode_updated_at: new Date().toISOString(),
        })
        .eq("id", leagueId)

      if (updateError) throw updateError

      setIsEnabled(newValue)
      onToggle?.(newValue)
      toast.success(`${FEATURE_LABELS[feature]} ${newValue ? "activado" : "desactivado"}`)
    } catch (error) {
      console.error("Error toggling feature:", error)
      toast.error("Error al actualizar la feature")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isUpdating}
        className="data-[state=checked]:bg-emerald-500"
      />
      {isUpdating && <Loader2 className="w-3 h-3 animate-spin text-white/50" />}
    </div>
  )
}

export default LeagueFeaturesEditor
