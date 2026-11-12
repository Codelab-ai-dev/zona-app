import { ArrowLeft, Home } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

/** Original public look: dark slate gradient with angled green bands. */
export const panelClass = 'rounded-xl border border-white/10 bg-slate-800/50'
export const navLinkClass =
  'inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400'
export const tabTriggerClass =
  'flex-1 rounded-lg px-3 py-2 text-sm text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 data-[state=active]:shadow-none'
export const mutedText = 'text-gray-400'

export function PublicPage({ children, back }: { children: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute right-0 top-0 h-screen w-1/3 skew-x-12 bg-gradient-to-bl from-green-500/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 h-screen w-1/4 -skew-x-12 bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent" />
        <div className="absolute right-10 top-10 h-48 w-48 rounded-full bg-green-500/5 blur-2xl" />
        <div className="absolute bottom-10 left-10 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-4 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            {back ? (
              <Link to={back.to} className={navLinkClass}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                {back.label}
              </Link>
            ) : (
              <span />
            )}
            <Link to="/" className={navLinkClass}>
              <Home className="size-4" aria-hidden="true" />
              Inicio
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 pt-4 sm:px-6 lg:px-8">{children}</main>
        <footer className="py-3 text-center">
          <p className="text-[10px] text-gray-700">© {new Date().getFullYear()} Zona Gol</p>
        </footer>
      </div>
    </div>
  )
}

/** League/team identity card shared by the league and tournament pages. */
export function HeroCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 shadow-2xl backdrop-blur-xl">
      <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rotate-12 bg-gradient-to-bl from-green-500/20 to-transparent" />
      <div className="relative p-5 md:p-6">{children}</div>
      <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-6 translate-y-6 -rotate-12 bg-gradient-to-tr from-emerald-500/10 to-transparent" />
    </div>
  )
}
