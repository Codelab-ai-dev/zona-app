import { ArrowLeft, Home } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { ZonaGolMark, ZonaOSLogo } from '@/components/brand/zona-logo'

/** Zona OS public look: carbon surfaces, purple identity, Zona Gol module accent. */
export const panelClass = 'rounded-[20px] border border-slate-800 bg-slate-900'
export const navLinkClass =
  'inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gol-400'
export const tabTriggerClass =
  'flex-1 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white data-[state=active]:bg-gol-400 data-[state=active]:font-semibold data-[state=active]:text-slate-950 data-[state=active]:shadow-none'
export const mutedText = 'text-slate-400'

export function PublicPage({ children, back }: { children: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 right-[-10%] h-[520px] w-[760px] rounded-full bg-gol-400/[0.06] blur-[130px]" />
        <div className="zona-grid absolute inset-x-0 top-0 h-[420px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="border-b border-slate-900 px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Link to="/" aria-label="Zona OS, inicio" className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gol-400">
                <ZonaOSLogo size="sm" />
              </Link>
              <span aria-hidden="true" className="hidden h-5 w-px rotate-[20deg] bg-slate-700 sm:block" />
              <span className="hidden items-center gap-1.5 text-xs font-semibold text-white sm:inline-flex">
                <ZonaGolMark className="h-[18px]" />
                Zona <span className="-ml-1 text-gol-400">Gol</span>
              </span>
              {back && (
                <Link to={back.to} className={`${navLinkClass} ml-1 md:ml-3`}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  <span className="truncate">{back.label}</span>
                </Link>
              )}
            </div>
            <Link to="/" className={navLinkClass}>
              <Home className="size-4" aria-hidden="true" />
              Inicio
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 pt-4 sm:px-6 lg:px-8">{children}</main>
        <footer className="py-3 text-center">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Zona OS · Zona Gol</p>
        </footer>
      </div>
    </div>
  )
}

/** League/team identity card shared by the league and tournament pages. */
export function HeroCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-slate-800 bg-slate-900">
      <div aria-hidden="true" className="gol-stripes absolute inset-y-0 right-0 w-2/5 [mask-image:linear-gradient(to_left,black,transparent)]" />
      <div className="relative p-5 md:p-7">{children}</div>
    </div>
  )
}
