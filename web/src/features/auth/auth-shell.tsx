import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { SportModuleTree } from '@/components/brand/sport-modules'
import { ZonaOSLogo, ZonaSymbol } from '@/components/brand/zona-logo'

/** Shared form look for the auth screens (Zona OS inputs: label on top, 48px). */
export const authInputClass =
  'h-12 md:h-12 rounded-xl border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500 transition-[border-color,box-shadow] duration-150 hover:border-slate-600 focus-visible:border-zona-400 focus-visible:ring-4 focus-visible:ring-zona-500/20'
export const authLabelClass = 'text-sm font-medium text-slate-300'
export const authButtonClass =
  'h-12 md:h-12 w-full rounded-xl bg-zona-500 font-semibold text-white shadow-[0_10px_30px_-10px_rgb(139_77_246/0.7)] hover:bg-zona-600 active:bg-zona-700'

/**
 * Two-panel auth layout. On large screens the left panel presents Zona OS as
 * the central platform with its sport modules; on small screens only the
 * lockup is kept so the form stays above the fold.
 */
export function AuthShell({ eyebrow = 'Panel de administración', title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-slate-950">
      <aside className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden border-r border-slate-800 bg-slate-900 p-12 lg:flex">
        <div aria-hidden="true" className="zona-stripes pointer-events-none absolute inset-0 [mask-image:linear-gradient(200deg,black,transparent_55%)]" />
        <ZonaSymbol className="pointer-events-none absolute -bottom-16 -right-24 h-[420px] opacity-[0.07]" />
        <div className="relative">
          <ZonaOSLogo size="md" descriptor />
        </div>
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zona-400">Plataforma operativa</p>
          <p className="mt-4 font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
            El sistema central para operar tu liga.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Un solo núcleo para ligas, equipos y jugadores. Cada deporte se conecta como un módulo.
          </p>
          <SportModuleTree className="mt-10" />
        </div>
        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} Zona OS</p>
      </aside>

      <main className="flex flex-1 flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <ZonaOSLogo size="sm" className="lg:invisible" />
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zona-400"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zona-400">{eyebrow}</p>
              <h1 className="mt-2 font-display text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-white">{title}</h1>
            </div>
            {children}
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 lg:hidden">© {new Date().getFullYear()} Zona OS</p>
      </main>
    </div>
  )
}

export const authLinkClass =
  'rounded text-sm text-zona-400 underline-offset-4 transition-colors duration-150 hover:text-zona-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zona-400'
export const authErrorClass = 'rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300'
