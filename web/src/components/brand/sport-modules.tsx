import { Volleyball } from 'lucide-react'
import type { ReactNode, SVGProps } from 'react'

import { cn } from '@/lib/utils'

import { ZonaGolMark, ZonaSymbol } from './zona-logo'

/* Line icons in the brand style: 24px grid, 1.8 stroke, round caps. */
function FootballIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m12 6 4 3-1.5 5h-5L8 9l4-3Zm-4 3-4-.5m11 5.5 3 3m-8.5-3-3 4m9-9 4-.5" />
    </svg>
  )
}

function BasketballIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20M2 12h20M5 4.9A10 10 0 0 1 7.6 12 10 10 0 0 1 5 19.1M19 4.9A10 10 0 0 0 16.4 12a10 10 0 0 0 2.6 7.1" />
    </svg>
  )
}

function VolleyballIcon(props: SVGProps<SVGSVGElement>) {
  return <Volleyball strokeWidth={1.8} aria-hidden="true" {...props} />
}

export type SportModule = {
  id: string
  sport: string
  /** Product name inside Zona OS, only for modules that exist. */
  product?: string
  status: 'active' | 'planned'
  Icon: (props: SVGProps<SVGSVGElement>) => ReactNode
}

/**
 * Sports in the Zona OS ecosystem. Football (Zona Gol) is the only operating
 * module; the others are shown as planned and have no product behind them.
 */
export const sportModules: SportModule[] = [
  { id: 'futbol', sport: 'Fútbol', product: 'Zona Gol', status: 'active', Icon: FootballIcon },
  { id: 'basquetbol', sport: 'Básquetbol', status: 'planned', Icon: BasketballIcon },
  { id: 'voleibol', sport: 'Vóleibol', status: 'planned', Icon: VolleyballIcon },
]

/**
 * The Zona OS core with its sport modules branching from it. Purely
 * presentational: planned modules are not links.
 */
export function SportModuleTree({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl border border-zona-400/30 bg-zona-500/10">
          <ZonaSymbol className="h-5" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-sm font-bold text-white">Zona OS</p>
          <p className="text-xs text-slate-400">Núcleo: ligas, equipos, jugadores y roles</p>
        </div>
      </div>
      <ul className="relative ml-[21px] mt-1 space-y-2 border-l border-dashed border-slate-600 pl-6 pt-3" aria-label="Módulos deportivos">
        {sportModules.map(({ id, sport, product, status, Icon }) => {
          const active = status === 'active'
          return (
            <li key={id} className="relative">
              <span aria-hidden="true" className="absolute -left-6 top-1/2 h-px w-5 border-t border-dashed border-slate-600" />
              <div
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                  active ? 'border-gol-400/30 bg-gol-400/[0.06]' : 'border-slate-700/70 bg-slate-900/40',
                )}
              >
                <Icon className={cn('size-5 shrink-0', active ? 'text-gol-400' : 'text-slate-500')} />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className={cn('text-sm font-semibold', active ? 'text-white' : 'text-slate-300')}>{sport}</p>
                  {product && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-400">
                      <ZonaGolMark className="h-4" /> {product}
                    </p>
                  )}
                </div>
                {active ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gol-400/10 px-2 py-0.5 text-[11px] font-semibold text-gol-300">
                    <span className="size-1.5 rounded-full bg-gol-400" aria-hidden="true" />
                    Operando
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] font-medium text-slate-400">Próximamente</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
