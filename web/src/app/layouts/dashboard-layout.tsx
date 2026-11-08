import { KeyRound, LogOut, Menu, Smartphone, Sparkles, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ChangePasswordDialog } from '@/features/auth/change-password-dialog'
import { useAuth, type Role } from '@/lib/auth/auth-context'
import { cn } from '@/lib/utils'

import type { NavItem } from '../area'
import { AppDownloadDialog } from './app-download-dialog'
import { gateTabs, orderTabs } from './dashboard-nav'
import { useLeagueCapabilities } from './league-capabilities'

const roleLabel: Record<Role, string> = {
  super_admin: 'Super Administrador',
  league_admin: 'Administrador de Liga',
  team_owner: 'Dueño de Equipo',
  public: 'Usuario',
}

const roleBadge: Record<Role, string> = {
  super_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  league_admin: 'bg-green-500/20 text-green-400 border-green-500/30',
  team_owner: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  public: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const productModes = {
  full: { label: 'Zona-G Completo', price: '$999 MXN/mes', icon: '🏆' },
  web_only: { label: 'Zona-G Web', price: '$499 MXN/mes', icon: '🌐' },
} as const

const headerButton = 'bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700'

function TabStrip({ items }: { items: NavItem[] }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = items.find((i) => i.to === pathname)?.to ?? ''
  if (items.length < 2) return null
  return (
    <>
      <div className="w-full md:hidden">
        <Select value={active} onValueChange={(to) => void navigate(to)}>
          <SelectTrigger aria-label="Sección" className="w-full bg-slate-800/50 border-white/10 text-white">
            <SelectValue placeholder="Seleccionar vista" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            {items.map((item) => (
              <SelectItem key={item.to} value={item.to} className="text-white hover:bg-slate-800">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <nav aria-label="Panel" className="hidden md:block">
        <ul className="flex flex-wrap gap-1 rounded-lg bg-slate-800/50 border border-white/10 p-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end
                className={({ isActive }) =>
                  cn(
                    'block whitespace-nowrap rounded-md px-3 py-1.5 text-center text-xs font-medium text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 motion-reduce:transition-none',
                    isActive && 'bg-green-500/20 text-green-400 hover:text-green-400',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

export function DashboardLayout({ children, nav = [] }: { children: ReactNode; nav?: NavItem[] }) {
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const isLeagueAdmin = profile?.role === 'league_admin'
  const caps = useLeagueCapabilities(isLeagueAdmin)
  const allowed = profile ? orderTabs(nav.filter((item) => item.roles.includes(profile.role))) : []
  const items = isLeagueAdmin ? gateTabs(allowed, caps) : allowed
  // With several leagues the badge shows the best plan among them.
  const mode = caps.leagues.some((l) => l.product_mode === 'full') ? 'full' : caps.leagues[0]?.product_mode
  const plan = mode ? productModes[mode] : undefined
  const showAppDownload = isLeagueAdmin && caps.has('mobile_app')

  return (
    <div className="min-h-dvh bg-slate-950 relative text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/3 h-screen bg-gradient-to-bl from-green-500/10 via-transparent to-transparent skew-x-12" />
        <div className="absolute bottom-0 left-0 w-1/4 h-screen bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent -skew-x-12" />
      </div>

      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <div className="flex items-center gap-3 md:gap-4">
              <img src="/zona-gol.png" alt="Zona Gol" className="w-14 h-14 md:w-20 md:h-20 rounded-lg object-contain" />
              {profile && (
                <div className="hidden md:flex flex-col">
                  <span className="text-sm font-medium text-white">Hola, {profile.name}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded border w-fit', roleBadge[profile.role])}>{roleLabel[profile.role]}</span>
                </div>
              )}
            </div>

            {plan && (
              <div className="hidden lg:flex items-center gap-2 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2">
                <Sparkles className="w-4 h-4 text-green-400" aria-hidden="true" />
                <span className="text-sm font-semibold text-white">
                  {plan.icon} {plan.label}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded', mode === 'full' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400')}>
                  {plan.price}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                {showAppDownload && (
                  <AppDownloadDialog
                    leagues={caps.leagues}
                    trigger={
                      <Button variant="outline" size="sm" className={headerButton}>
                        <Smartphone className="h-4 w-4 mr-2" aria-hidden="true" />
                        App Móvil
                      </Button>
                    }
                  />
                )}
                <ChangePasswordDialog
                  trigger={
                    <Button variant="outline" size="sm" className={headerButton}>
                      <KeyRound className="w-4 h-4 mr-2" aria-hidden="true" />
                      Cambiar contraseña
                    </Button>
                  }
                />
                <Button variant="outline" size="sm" onClick={() => void signOut()} className={headerButton}>
                  <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                  Cerrar Sesión
                </Button>
              </div>

              <div className="md:hidden">
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Abrir menú" className="bg-slate-800/50 hover:bg-slate-700 text-white border border-white/10">
                      <Menu className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] p-0 bg-slate-900 border-white/10 text-white">
                    <SheetHeader className="p-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <img src="/zona-gol-logo.webp" alt="" className="w-10 h-10 rounded-lg" />
                        <div>
                          <SheetTitle className="text-white text-base">Zona Gol</SheetTitle>
                          <p className="text-xs text-gray-500">Panel de control</p>
                        </div>
                      </div>
                    </SheetHeader>
                    <div className="flex flex-col h-[calc(100%-80px)] justify-between p-4">
                      <div className="space-y-4">
                        {profile && (
                          <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-green-400" aria-hidden="true" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate">{profile.name}</p>
                                <span className={cn('inline-block text-xs px-2 py-0.5 rounded border mt-1', roleBadge[profile.role])}>
                                  {roleLabel[profile.role]}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        {plan && (
                          <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Plan Actual</p>
                            <span className="text-sm font-semibold text-white">
                              {plan.icon} {plan.label}
                            </span>
                          </div>
                        )}
                        {showAppDownload && (
                          <AppDownloadDialog
                            leagues={caps.leagues}
                            trigger={
                              <Button variant="outline" className={cn('w-full', headerButton)}>
                                <Smartphone className="h-4 w-4 mr-2" aria-hidden="true" />
                                Descargar App Móvil
                              </Button>
                            }
                          />
                        )}
                        <ChangePasswordDialog
                          trigger={
                            <Button variant="outline" className={cn('w-full', headerButton)}>
                              <KeyRound className="w-4 h-4 mr-2" aria-hidden="true" />
                              Cambiar contraseña
                            </Button>
                          }
                        />
                      </div>
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setMenuOpen(false)
                            void signOut()
                          }}
                          className="w-full bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                        >
                          <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                          Cerrar Sesión
                        </Button>
                        <p className="text-xs text-center text-gray-600">Zona Gol © {new Date().getFullYear()}</p>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 space-y-4 md:space-y-6">
        {/* Only league admins navigate with this strip; the super admin and
            team owner pages carry their own inner tabs, as in the original. */}
        {isLeagueAdmin && <TabStrip items={items} />}
        {children}
      </main>
    </div>
  )
}
