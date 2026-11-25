import { KeyRound, LogOut, Menu, PlugZap, Smartphone, Sparkles, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { ZonaGolMark, ZonaOSLogo } from '@/components/brand/zona-logo'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ChangePasswordDialog } from '@/features/auth/change-password-dialog'
import { ConnectedAppsDialog } from '@/features/auth/connected-apps-dialog'
import { connectionsEnabled } from '@/features/auth/connections'
import { useAuth, type Role } from '@/lib/auth/auth-context'
import { cn } from '@/lib/utils'

import type { NavItem } from '../area'
import { AppDownloadDialog } from './app-download-dialog'
import { gateTabs, orderTabs } from './dashboard-nav'
import { SectionCarousel } from './section-carousel'
import { useLeagueCapabilities } from './league-capabilities'
import { useIdleTimeout } from './use-idle-timeout'

const roleLabel: Record<Role, string> = {
  super_admin: 'Super Administrador',
  league_admin: 'Administrador de Liga',
  team_owner: 'Dueño de Equipo',
  public: 'Usuario',
}

const roleBadge: Record<Role, string> = {
  super_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  league_admin: 'bg-gol-500/20 text-gol-400 border-gol-500/30',
  team_owner: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  public: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const productModes = {
  full: { label: 'Zona-G Completo', price: '$999 MXN/mes', icon: '🏆' },
  web_only: { label: 'Zona-G Web', price: '$499 MXN/mes', icon: '🌐' },
} as const

const headerButton = 'h-10 min-w-10 bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600'

function TabStrip({ items }: { items: NavItem[] }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = items.find((i) => i.to === pathname)?.to ?? ''
  if (items.length < 2) return null
  return (
    <>
      <div className="w-full md:hidden">
        <Select value={active} onValueChange={(to) => void navigate(to)}>
          <SelectTrigger aria-label="Sección" className="w-full h-11 rounded-xl bg-slate-900 border-slate-800 text-white">
            <SelectValue placeholder="Seleccionar vista" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            {items.map((item) => (
              <SelectItem key={item.to} value={item.to} className="text-white hover:bg-slate-800">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SectionCarousel items={items} />
    </>
  )
}

export function DashboardLayout({ children, nav = [] }: { children: ReactNode; nav?: NavItem[] }) {
  const { profile, signOut, expire } = useAuth()
  useIdleTimeout(() => void expire())
  const [menuOpen, setMenuOpen] = useState(false)
  const isLeagueAdmin = profile?.role === 'league_admin'
  const caps = useLeagueCapabilities(isLeagueAdmin)
  const allowed = profile ? orderTabs(nav.filter((item) => item.roles.includes(profile.role))) : []
  const items = isLeagueAdmin ? gateTabs(allowed, caps) : allowed
  // With several leagues the badge shows the best plan among them.
  const mode = caps.leagues.some((l) => l.product_mode === 'full') ? 'full' : caps.leagues[0]?.product_mode
  const plan = mode ? productModes[mode] : undefined
  const showAppDownload = isLeagueAdmin && caps.has('mobile_app')
  // Only league admins and team owners may connect AI clients (the API enforces it).
  const showConnections = connectionsEnabled && (profile?.role === 'league_admin' || profile?.role === 'team_owner')

  return (
    <div className="min-h-dvh bg-slate-950 relative text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-[-10%] h-[520px] w-[720px] rounded-full bg-gol-400/[0.06] blur-[120px]" />
        <div className="zona-grid absolute inset-x-0 top-0 h-[420px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>

      <header className="bg-slate-950/85 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center gap-4 h-16 md:h-20">
            <div className="flex min-w-0 items-center gap-3 md:gap-4">
              <ZonaOSLogo size="sm" className="md:hidden" />
              <ZonaOSLogo size="md" className="hidden md:inline-flex" />
              {/* The sport module this panel operates, under the Zona OS core. */}
              <span aria-hidden="true" className="hidden h-6 w-px rotate-[20deg] bg-slate-700 sm:block" />
              <span className="hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-gol-400/25 bg-gol-400/[0.06] py-1 pl-2 pr-3 sm:inline-flex">
                <ZonaGolMark className="h-5" />
                <span className="text-xs font-semibold text-white">
                  Zona <span className="text-gol-400">Gol</span>
                </span>
                <span className="sr-only">, módulo de fútbol</span>
              </span>
              {profile && (
                <div className="hidden min-w-0 xl:flex flex-col gap-1 border-l border-slate-800 pl-4">
                  <span className="truncate text-sm font-medium text-white">Hola, {profile.name}</span>
                  <span className={cn('max-w-full truncate whitespace-nowrap text-xs px-2 py-0.5 rounded-md border w-fit', roleBadge[profile.role])}>{roleLabel[profile.role]}</span>
                </div>
              )}
            </div>

            {plan && (
              <div className="hidden lg:flex shrink-0 items-center gap-2 whitespace-nowrap bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                <Sparkles className="w-4 h-4 text-gol-400" aria-hidden="true" />
                <span className="text-sm font-semibold text-white">
                  {plan.icon} {plan.label}
                </span>
                <span className={cn('hidden 2xl:inline text-xs px-2 py-0.5 rounded-md', mode === 'full' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400')}>
                  {plan.price}
                </span>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                {showAppDownload && (
                  <AppDownloadDialog
                    leagues={caps.leagues}
                    trigger={
                      <Button variant="outline" size="sm" aria-label="App Móvil" title="App Móvil" className={headerButton}>
                        <Smartphone className="size-4 xl:mr-1" aria-hidden="true" />
                        <span className="hidden xl:inline">App Móvil</span>
                      </Button>
                    }
                  />
                )}
                {showConnections && (
                  <ConnectedAppsDialog
                    trigger={
                      <Button variant="outline" size="sm" aria-label="Aplicaciones conectadas" title="Aplicaciones conectadas" className={headerButton}>
                        {/* Icon only: the header has no room left for another label. */}
                        <PlugZap className="size-4" aria-hidden="true" />
                      </Button>
                    }
                  />
                )}
                <ChangePasswordDialog
                  trigger={
                    <Button variant="outline" size="sm" aria-label="Cambiar contraseña" title="Cambiar contraseña" className={headerButton}>
                      <KeyRound className="size-4 xl:mr-1" aria-hidden="true" />
                      <span className="hidden xl:inline">Cambiar contraseña</span>
                    </Button>
                  }
                />
                <Button variant="outline" size="sm" aria-label="Cerrar Sesión" title="Cerrar Sesión" onClick={() => void signOut()} className={headerButton}>
                  <LogOut className="size-4 xl:mr-1" aria-hidden="true" />
                  <span className="hidden xl:inline">Cerrar Sesión</span>
                </Button>
              </div>

              <div className="md:hidden">
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Abrir menú" className="size-11 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700">
                      <Menu className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] p-0 bg-slate-950 border-slate-800 text-white">
                    <SheetHeader className="p-4 border-b border-slate-800">
                      <ZonaOSLogo size="sm" />
                      <SheetTitle className="mt-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <ZonaGolMark className="h-5" />
                        Zona <span className="-ml-1 text-gol-400">Gol</span>
                        <span className="font-normal text-slate-400">· Panel de control</span>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col h-[calc(100%-80px)] justify-between p-4">
                      <div className="space-y-4">
                        {profile && (
                          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-gol-500/15 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-gol-400" aria-hidden="true" />
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
                          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
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
                        {showConnections && (
                          <ConnectedAppsDialog
                            trigger={
                              <Button variant="outline" className={cn('w-full', headerButton)}>
                                <PlugZap className="w-4 h-4 mr-2" aria-hidden="true" />
                                Aplicaciones conectadas
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
                        <p className="text-xs text-center text-slate-500">Zona OS © {new Date().getFullYear()}</p>
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
