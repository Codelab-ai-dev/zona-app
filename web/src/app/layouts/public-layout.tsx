import { LogIn } from 'lucide-react'
import { Link, Outlet } from 'react-router'

import { useAuth } from '@/lib/auth/auth-context'

export function PublicLayout() {
  const { status } = useAuth()
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <header className="border-b">
        <nav aria-label="Principal" className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="font-bold tracking-tight">
            Zona Gol
          </Link>
          <Link
            to={status === 'authenticated' ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent/20"
          >
            <LogIn className="size-4" aria-hidden="true" />
            {status === 'authenticated' ? 'Mi panel' : 'Administradores'}
          </Link>
        </nav>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
