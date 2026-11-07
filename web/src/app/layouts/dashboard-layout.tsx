import { LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/utils'

import type { NavItem } from '../area'

export function DashboardLayout({ children, nav = [] }: { children: ReactNode; nav?: NavItem[] }) {
  const { profile, signOut } = useAuth()
  const items = profile ? nav.filter((item) => item.roles.includes(profile.role)) : []

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-6 px-4">
          <Link to="/" className="font-bold tracking-tight">
            Zona Gol
          </Link>
          <nav aria-label="Panel" className="flex flex-1 gap-1 overflow-x-auto">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn('whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent/20', isActive && 'bg-primary/10 text-primary')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <span className="hidden text-sm text-muted-foreground sm:inline">{profile?.name}</span>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-4" aria-hidden="true" />
            Salir
          </Button>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  )
}
