import { Edit, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { League } from '../types'

interface LeagueCardProps {
  league: League
  busy: boolean
  onEdit: () => void
  onFeatures: () => void
  onDeactivate: () => void
  onActivate: () => void
  onDelete: () => void
}

const ghost = 'bg-slate-700/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700 h-7 px-2'

export function LeagueCard({ league, busy, onEdit, onFeatures, onDeactivate, onActivate, onDelete }: LeagueCardProps) {
  return (
    <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3 md:p-4 hover:bg-slate-800/70 transition-all">
      <div className="flex items-start gap-3 mb-3">
        {league.logo ? (
          <img
            src={league.logo}
            alt={`Logo de ${league.name}`}
            className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-lg bg-slate-700/50 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-green-400 font-bold text-sm">{league.name.charAt(0)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm md:text-base truncate">{league.name}</h3>
          <p className="text-[10px] md:text-xs text-gray-500 truncate">/{league.slug}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${league.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {league.is_active ? 'Activa' : 'Inactiva'}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${league.product_mode === 'full' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {league.product_mode === 'full' ? 'Completo' : 'Web'}
            </span>
          </div>
        </div>
      </div>

      {league.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{league.description}</p>}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onEdit} aria-label={`Editar ${league.name}`} className={ghost}>
          <Edit className="w-3 h-3" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onFeatures}
          className="bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 h-7 px-2"
          title="Configurar features"
          aria-label={`Configurar features de ${league.name}`}
        >
          <Settings className="w-3 h-3" aria-hidden="true" />
        </Button>
        {league.is_active ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onDeactivate}
            disabled={busy}
            aria-label="Desactivar liga"
            className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 h-7 px-2 text-[10px]"
          >
            Desactivar
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onActivate} disabled={busy} className={`${ghost} text-[10px]`}>
            Activar
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          aria-label={`Eliminar ${league.name}`}
          className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 h-7 px-2 ml-auto"
        >
          <Trash2 className="w-3 h-3" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
