"use client"

import type React from "react"
import { useState } from "react"

import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Menu, LogOut, User, Smartphone } from "lucide-react"
import { useRouter } from "next/navigation"
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "destructive"
      case "league_admin":
        return "default"
      case "team_owner":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Left side - Logo + User Info */}
            <div className="flex items-center gap-4">
              <img
                src="/zona-gol-final.webp"
                alt="Zona-Gol Logo"
                width={60}
                height={60}
                className="rounded"
              />

              {/* User info - Desktop */}
              <div className="hidden md:flex items-center gap-3">
                {profile && (
                  <>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        Hola, {profile.name}
                      </span>
                      <Badge variant={getRoleBadgeVariant(profile.role)} className="text-xs w-fit">
                        {getRoleLabel(profile.role)}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              {/* Theme Toggle - always visible */}
              <ThemeToggle />

              {/* Desktop - App Mobile + Logout Button together */}
              <div className="hidden md:flex items-center gap-2">
                {/* App Mobile - Only for League Admins */}
                {profile?.role === 'league_admin' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        App Móvil
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Smartphone className="h-5 w-5 text-soccer-green" />
                          Descargar App Móvil
                        </DialogTitle>
                        <DialogDescription>
                          Descarga la aplicación móvil de Zona-Gol para tu dispositivo Android
                        </DialogDescription>
                      </DialogHeader>
                      {profile?.league_id && <AppDownload leagueId={profile.league_id} />}
                    </DialogContent>
                  </Dialog>
                )}

                <Button variant="outline" onClick={handleSignOut} size="sm">
                  Cerrar Sesión
                </Button>
              </div>

              {/* Mobile Menu - Only for logout and badge */}
              <div className="md:hidden">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-accent">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Abrir menú</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[320px] p-0">
                    {/* Header with gradient */}
                    <SheetHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img
                            src="/zona-gol-final.webp"
                            alt="Zona-Gol"
                            className="w-14 h-14 rounded-lg shadow-sm"
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                        </div>
                        <div>
                          <SheetTitle className="text-lg font-bold">Zona Gol</SheetTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">Panel de control</p>
                        </div>
                      </div>
                    </SheetHeader>

                    <div className="flex flex-col h-[calc(100%-100px)] justify-between p-6">
                      <div className="flex flex-col space-y-6">
                        {/* User Info Card */}
                        {profile && (
                          <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start space-x-3">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md flex-shrink-0">
                                <User className="w-7 h-7 text-primary-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-base truncate">{profile.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {profile.role === 'league_admin' && 'Administrador'}
                                  {profile.role === 'team_owner' && 'Propietario'}
                                  {profile.role === 'super_admin' && 'Super Admin'}
                                </p>
                                <Badge
                                  variant={getRoleBadgeVariant(profile.role)}
                                  className="text-xs mt-2 font-medium"
                                >
                                  {getRoleLabel(profile.role)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )}

                        <Separator className="my-2" />

                        {/* Quick Stats or Info */}
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Acceso Rápido
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                              <span className="text-muted-foreground">Sistema activo</span>
                            </div>
                          </div>
                        </div>

                        {/* App Download Button - Mobile - Only for League Admins */}
                        {profile?.role === 'league_admin' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="w-full">
                                <Smartphone className="h-4 w-4 mr-2" />
                                Descargar App Móvil
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Smartphone className="h-5 w-5 text-soccer-green" />
                                  Descargar App Móvil
                                </DialogTitle>
                                <DialogDescription>
                                  Descarga la aplicación móvil de Zona-Gol para tu dispositivo Android
                                </DialogDescription>
                              </DialogHeader>
                              {profile?.league_id && <AppDownload leagueId={profile.league_id} />}
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>

                      {/* Sign Out Button - Fixed at bottom */}
                      <div className="space-y-3 pt-4">
                        <Separator />
                        <Button
                          variant="destructive"
                          onClick={() => {
                            handleSignOut()
                            setMobileMenuOpen(false)
                          }}
                          className="w-full h-12 font-semibold shadow-md hover:shadow-lg transition-all"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Cerrar Sesión
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
