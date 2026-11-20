import { Link } from 'react-router'

import { ZonaOSLogo } from '@/components/brand/zona-logo'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-slate-950 p-6 text-center">
      <ZonaOSLogo size="md" />
      <p className="font-display text-7xl font-extrabold tracking-[-0.04em] zona-text-gradient" aria-hidden="true">404</p>
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="text-muted-foreground">La dirección no existe o ya no está disponible.</p>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center rounded-xl bg-zona-500 px-5 font-semibold text-white transition-colors hover:bg-zona-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zona-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        Volver al inicio
      </Link>
    </main>
  )
}
