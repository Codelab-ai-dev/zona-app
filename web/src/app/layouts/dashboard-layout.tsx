import { LogOut, Menu } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'

import { ChangePasswordDialog } from '@/features/auth/change-password-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/utils'

import type { NavItem } from '../area'

/** Sections of the dashboard navigation, in display order. */
const sections: { title: string; match: (to: string) => boolean }[] = [
  { title: 'General', match: (to) => to === '/admin' || to === '/liga-admin' || to === '/mi-equipo' },
  { title: 'Competición', match: (to) => /^\/liga-admin\/(calendario|fixtures|playoffs|torneos|tabla|goleadores|suspensiones)/.test(to) },
  { title: 'Equipos y jugadores', match: (to) => /^\/liga-admin\/(equipos|solicitudes|grupos|verificacion|qr-batch)/.test(to) },
  { title: 'Administración', match: (to) => /^\/liga-admin\/(finanzas|whatsapp|ajustes)/.test(to) },
  { title: 'Contenido', match: (to) => to.startsWith('/play') },
]

export function groupNav(items: NavItem[]): { title: string; items: NavItem[] }[] {
  const used = new Set<NavItem>()
  const groups = sections.map((section) => {
    const sectionItems = items.filter((item) => !used.has(item) && section.match(item.to))
    sectionItems.forEach((item) => used.add(item))
    return { title: section.title, items: sectionItems }
  })
  const rest = items.filter((item) => !used.has(item))
  if (rest.length > 0) groups.push({ title: 'Otros', items: rest })
  return groups.filter((g) => g.items.length > 0)
}

function SideNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Panel" className="space-y-6">
      {groupNav(items).map((group) => (
        <div key={group.title} className="space-y-1">
          <h2 className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive && 'bg-primary/10 text-primary',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function DashboardLayout({ children, nav = [] }: { children: ReactNode; nav?: NavItem[] }) {
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const items = profile ? nav.filter((item) => item.roles.includes(profile.role)) : []

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          {items.length > 0 && (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto p-4">
                <SheetHeader className="mb-4 p-0">
                  <SheetTitle>Menú</SheetTitle>
                </SheetHeader>
                <SideNav items={items} onNavigate={() => setMenuOpen(false)} />
              </SheetContent>
            </Sheet>
          )}
          <Link to="/" className="font-bold tracking-tight">
            Zona Gol
          </Link>
          <span className="ml-auto hidden truncate text-sm text-muted-foreground sm:inline">{profile?.name}</span>
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <ChangePasswordDialog />
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-4" aria-hidden="true" />
            Salir
          </Button>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        {items.length > 0 && (
          <aside className="hidden w-60 shrink-0 border-r p-4 lg:block">
            <div className="sticky top-18">
              <SideNav items={items} />
            </div>
          </aside>
        )}
        <main id="main" className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
