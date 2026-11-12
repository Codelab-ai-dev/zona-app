import type { ReactNode } from 'react'
import { Link } from 'react-router'

/** Shared input look from the original login form. */
export const authInputClass =
  'relative h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-gray-600 focus:border-emerald-500/50 focus:bg-white/[0.08] focus-visible:ring-emerald-500/20 transition-all duration-300'
export const authLabelClass = 'text-xs font-medium uppercase tracking-wider text-gray-400'
export const authButtonClass =
  'relative h-14 w-full overflow-hidden rounded-xl border-0 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.02] hover:from-emerald-400 hover:via-emerald-300 hover:to-emerald-400 hover:shadow-emerald-500/40 active:scale-[0.98]'

const css = `
@keyframes zg-pulse-slow{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes zg-float{0%,100%{transform:translateY(0) translateX(0)}25%{transform:translateY(-20px) translateX(10px)}50%{transform:translateY(-10px) translateX(-5px)}75%{transform:translateY(-30px) translateX(5px)}}
.zg-pulse{animation:zg-pulse-slow 4s ease-in-out infinite}
.zg-float{animation:zg-float 8s ease-in-out infinite}
@keyframes zg-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.zg-in{animation:zg-in .7s ease-out both}
@media (prefers-reduced-motion: reduce){.zg-pulse,.zg-float,.zg-in{animation:none}}
`

export function AuthShell({ title = 'Panel de Administración', children }: { title?: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#030712]">
      <style>{css}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="zg-pulse absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="zg-pulse absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-[100px]" />
        <div className="zg-pulse absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-emerald-600/5 blur-[80px]" />
        <svg className="absolute bottom-0 left-0 h-64 w-full opacity-[0.02]" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice">
          <circle cx="600" cy="350" r="120" fill="none" stroke="white" strokeWidth="3" />
          <line x1="0" y1="200" x2="1200" y2="200" stroke="white" strokeWidth="3" />
          <path d="M 500 350 A 150 150 0 0 1 700 350" fill="none" stroke="white" strokeWidth="3" />
        </svg>
        <div className="zg-float absolute left-[20%] top-20 h-1 w-1 rounded-full bg-emerald-400/40" />
        <div className="zg-float absolute left-[60%] top-40 h-1.5 w-1.5 rounded-full bg-cyan-400/30" />
        <div className="zg-float absolute left-[80%] top-60 h-1 w-1 rounded-full bg-emerald-300/40" />
        <div className="zg-float absolute left-[40%] top-32 h-0.5 w-0.5 rounded-full bg-white/30" />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className={`w-full max-w-[420px] zg-in`}>
          <div className="mb-10 text-center">
            <div className="relative mb-6 inline-block">
              <div className="zg-pulse absolute inset-0 scale-150 rounded-full bg-emerald-500/20 blur-3xl" />
              <div className="relative mx-auto h-36 w-36 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-[3px] shadow-2xl shadow-emerald-500/30 md:h-40 md:w-40">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#030712]">
                  <img src="/zona-gol.png" alt="Zona Gol" width={128} height={128} className="h-28 w-28 object-contain md:h-32 md:w-32" />
                </div>
              </div>
            </div>
            <p className="mb-2 font-[family-name:var(--font-orbitron)] text-3xl font-black tracking-tight md:text-4xl" aria-hidden="true">
              <span className="bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">ZONA GOL</span>
            </p>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{title}</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-sm" />
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-8 backdrop-blur-xl">
              <div className="absolute left-0 top-0 h-16 w-16 rounded-tl-2xl border-l-2 border-t-2 border-emerald-500/30" />
              <div className="absolute bottom-0 right-0 h-16 w-16 rounded-br-2xl border-b-2 border-r-2 border-emerald-500/30" />
              {children}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/" className="group inline-flex items-center gap-2 text-sm text-gray-500 transition-colors duration-200 hover:text-white">
              <span className="h-px w-8 bg-gray-700 transition-all duration-300 group-hover:w-12 group-hover:bg-emerald-500" />
              <span>Volver al inicio</span>
              <span className="h-px w-8 bg-gray-700 transition-all duration-300 group-hover:w-12 group-hover:bg-emerald-500" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center">
        <p className="text-xs uppercase tracking-widest text-gray-600">© 2025 Zona Gol — Gestión de Ligas</p>
      </footer>
    </div>
  )
}

export const authLinkClass = 'text-sm text-gray-500 underline-offset-4 transition-colors duration-200 hover:text-emerald-400 hover:underline'
export const authErrorClass = 'rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400'
