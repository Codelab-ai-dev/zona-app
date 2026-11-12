import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SystemStats } from './components/system-stats'
import { LeagueManagement } from './components/league-management'
import { UsersManagement } from './components/users-management'
import { AppReleases } from './components/app-releases'

const tabs = [
  { value: 'overview', label: 'Resumen' },
  { value: 'leagues', label: 'Gestión de Ligas' },
  { value: 'users', label: 'Usuarios' },
  { value: 'apps', label: 'App Móvil' },
]

const triggerClass = 'text-gray-400 dark:text-gray-400 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 dark:data-[state=active]:bg-green-500/20 dark:data-[state=active]:text-green-400 dark:data-[state=active]:border-transparent'

/** Super admin dashboard: same tab strip as the original (Resumen, Gestión de Ligas, App Móvil) plus users. */
export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="w-full">
      <h1 className="sr-only">Administración del Sistema</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <div className="w-full md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger aria-label="Seleccionar vista" className="w-full bg-slate-800/50 border-white/10 text-white">
              <SelectValue placeholder="Seleccionar vista" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {tabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value} className="text-white hover:bg-slate-800">
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsList className="hidden md:grid w-full grid-cols-4 bg-slate-800/50 border border-white/10">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className={triggerClass}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <SystemStats />
        </TabsContent>
        <TabsContent value="leagues">
          <LeagueManagement />
        </TabsContent>
        <TabsContent value="users">
          <UsersManagement />
        </TabsContent>
        <TabsContent value="apps">
          <AppReleases />
        </TabsContent>
      </Tabs>
    </div>
  )
}
