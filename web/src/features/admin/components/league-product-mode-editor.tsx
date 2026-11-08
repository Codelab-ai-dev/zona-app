import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { useUpdateLeagueProductMode } from '../api'
import type { League, ProductMode } from '../types'
import { PRODUCT_MODE_CONFIG } from './product-mode-config'
import { ProductModeSelector } from './product-mode-selector'

/** Change the product mode of an existing league (also resets its features to the plan defaults). */
export function LeagueProductModeEditor({ league }: { league: League }) {
  const updateMode = useUpdateLeagueProductMode()
  const [current, setCurrent] = useState<ProductMode>(league.product_mode)
  const [selected, setSelected] = useState<ProductMode>(league.product_mode)

  const handleSave = async () => {
    try {
      await updateMode.mutateAsync({ id: league.id, data: { product_mode: selected, features: PRODUCT_MODE_CONFIG[selected].features } })
      setCurrent(selected)
      toast.success('Tipo de producto actualizado exitosamente')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al cambiar el tipo de producto')
    }
  }

  return (
    <div className="space-y-3">
      <ProductModeSelector value={selected} onChange={setSelected} disabled={updateMode.isPending} />
      <p className="text-[10px] md:text-xs text-gray-500">
        Cambiar el tipo de producto reemplaza las funciones activas de la liga por las del plan elegido.
      </p>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => void handleSave()}
          disabled={updateMode.isPending || selected === current}
          className="bg-green-500 hover:bg-green-600 text-white border-0"
        >
          {updateMode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {updateMode.isPending ? 'Guardando…' : 'Cambiar tipo de producto'}
        </Button>
      </div>
    </div>
  )
}
