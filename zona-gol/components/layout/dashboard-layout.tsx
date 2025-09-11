"use client"

import type React from "react"

import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useRouter } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth()
  const router = useRouter()

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
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            <div className="flex items-center space-x-4">
              <img
                src="/zona-gol-final.webp"
                alt="Zona-Gol Logo"
                width={92}
                height={92}
                className="rounded, mt-4 mb-4"
              />
              {profile && (
                <Badge variant={getRoleBadgeVariant(profile.role)} className="text-xs">
                  {getRoleLabel(profile.role)}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {profile && <span className="text-sm text-muted-foreground">Hola, {profile.name}</span>}
              <ThemeToggle />
              <Button variant="outline" onClick={handleSignOut}>
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
