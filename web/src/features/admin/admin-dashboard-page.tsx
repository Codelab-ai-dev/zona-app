import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Settings, Users, Package } from 'lucide-react'
import { SystemStats } from './components/system-stats'
import { LeagueManagement } from './components/league-management'
import { UsersManagement } from './components/users-management'
import { AppReleases } from './components/app-releases'

/**
 * Super admin dashboard with tabs for overview, league management, users, and app releases.
 */
export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <main className="w-full space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Administración del Sistema</h1>
        <p className="text-muted-foreground">Gestiona ligas, usuarios y configuración</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="leagues" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Ligas</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="apps" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">APK</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SystemStats />
        </TabsContent>

        <TabsContent value="leagues" className="space-y-6">
          <LeagueManagement />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="apps" className="space-y-6">
          <AppReleases />
        </TabsContent>
      </Tabs>
    </main>
  )
}
