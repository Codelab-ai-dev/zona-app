"use client"

import type React from "react"
import { useState } from "react"

import { useAuth } from "@/lib/hooks/use-auth"
import { useIdleTimeout } from "@/lib/hooks/use-idle-timeout"
import { authConfig } from "@/lib/config/auth-config"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Menu, LogOut, User, Smartphone, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLeagueFeatures } from "@/lib/hooks/use-league-features"
import { PRODUCT_MODE_CONFIG } from "@/lib/types/product-mode"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AppDownload } from "@/components/shared/app-download"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Get league features for league_admin users
  const { productMode, loading: loadingFeatures } = useLeagueFeatures(
    profile?.role === 'league_admin' ? profile?.league_id : undefined
  )

  // Activar detector de inactividad (20 minutos por defecto)
  useIdleTimeout({
    timeout: authConfig.idleTimeout,
    promptBeforeIdle: authConfig.idleWarningTime,
  })

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Administrador"
      case "league_admin":
        return "Administrador de Liga"
      case "team_owner":
        return "Dueño de Equipo"
      default:
        return "Usuario"
    }
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "league_admin":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "team_owner":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Background gradient accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/3 h-screen bg-gradient-to-bl from-green-500/10 via-transparent to-transparent transform skew-x-12" />
        <div className="absolute bottom-0 left-0 w-1/4 h-screen bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent transform -skew-x-12" />
      </div>

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Left side - Logo + User Info */}
            <div className="flex items-center gap-3 md:gap-4">
              <img
                src="/zona-gol.png"
                alt="Zona-Gol Logo"
                className="w-14 h-14 md:w-20 md:h-20 rounded-lg object-contain"
              />

              {/* User info - Desktop */}
              <div className="hidden md:flex items-center gap-3">
                {profile && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">
                      Hola, {profile.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border w-fit ${getRoleBadgeClass(profile.role)}`}>
                      {getRoleLabel(profile.role)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Center - Product Mode Badge (Desktop Only) */}
            {profile?.role === 'league_admin' && !loadingFeatures && productMode && (
              <div className="hidden lg:flex items-center gap-2 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2">
                <Sparkles className="w-4 h-4 text-green-400" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {PRODUCT_MODE_CONFIG[productMode].icon} {PRODUCT_MODE_CONFIG[productMode].label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${productMode === 'full' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {PRODUCT_MODE_CONFIG[productMode].price}
                  </span>
                </div>
              </div>
            )}

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              {/* Desktop - App Mobile + Logout Button */}
              <div className="hidden md:flex items-center gap-2">
                {/* App Mobile - Only for League Admins */}
                {profile?.role === 'league_admin' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700">
                        <Smartphone className="h-4 w-4 mr-2" />
                        App Móvil
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                          <Smartphone className="h-5 w-5 text-green-400" />
                          Descargar App Móvil
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                          Descarga la aplicación móvil de Zona-Gol para tu dispositivo Android
                        </DialogDescription>
                      </DialogHeader>
                      {profile?.league_id && <AppDownload leagueId={profile.league_id} />}
                    </DialogContent>
                  </Dialog>
                )}

                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  size="sm"
                  className="bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>

              {/* Mobile Menu */}
              <div className="md:hidden">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="bg-slate-800/50 hover:bg-slate-700 text-white border border-white/10">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Abrir menú</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] p-0 bg-slate-900 border-white/10">
                    {/* Header */}
                    <SheetHeader className="p-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <img
                          src="/zona-gol-final.webp"
                          alt="Zona-Gol"
                          className="w-10 h-10 rounded-lg"
                        />
                        <div>
                          <SheetTitle className="text-white text-base">Zona Gol</SheetTitle>
                          <p className="text-xs text-gray-500">Panel de control</p>
                        </div>
                      </div>
                    </SheetHeader>

                    <div className="flex flex-col h-[calc(100%-80px)] justify-between p-4">
                      <div className="space-y-4">
                        {/* User Info Card */}
                        {profile && (
                          <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-green-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate">{profile.name}</p>
                                <span className={`inline-block text-xs px-2 py-0.5 rounded border mt-1 ${getRoleBadgeClass(profile.role)}`}>
                                  {getRoleLabel(profile.role)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Product Mode Badge - Mobile */}
                        {profile?.role === 'league_admin' && !loadingFeatures && productMode && (
                          <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-green-500/20">
                                <Sparkles className="w-4 h-4 text-green-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                                  Plan Actual
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-white">
                                    {PRODUCT_MODE_CONFIG[productMode].icon} {PRODUCT_MODE_CONFIG[productMode].label}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${productMode === 'full' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {PRODUCT_MODE_CONFIG[productMode].price}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* System Status */}
                        <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
                          <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                            Estado
                          </h4>
                          <div className="flex items-center text-sm">
                            <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                            <span className="text-gray-400">Sistema activo</span>
                          </div>
                        </div>

                        {/* App Download Button - Mobile - Only for League Admins */}
                        {profile?.role === 'league_admin' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="w-full bg-slate-800/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700">
                                <Smartphone className="h-4 w-4 mr-2" />
                                Descargar App Móvil
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-white">
                                  <Smartphone className="h-5 w-5 text-green-400" />
                                  Descargar App Móvil
                                </DialogTitle>
                                <DialogDescription className="text-gray-500">
                                  Descarga la aplicación móvil de Zona-Gol para tu dispositivo Android
                                </DialogDescription>
                              </DialogHeader>
                              {profile?.league_id && <AppDownload leagueId={profile.league_id} />}
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>

                      {/* Sign Out Button */}
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          onClick={() => {
                            handleSignOut()
                            setMobileMenuOpen(false)
                          }}
                          className="w-full bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Cerrar Sesión
                        </Button>
                        <p className="text-xs text-center text-gray-600">
                          Zona Gol © 2024
                        </p>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {children}
      </main>
    </div>
  )
}
