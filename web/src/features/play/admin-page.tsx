import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { AdminClips } from './admin-clips'
import { AdminStreams } from './admin-streams'
import { AdminVideos } from './admin-videos'

export function AdminPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Zona Play Admin</h1>
        <p className="text-muted-foreground">Gestiona tus videos, clips y transmisiones</p>
      </header>

      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="clips">Clips</TabsTrigger>
          <TabsTrigger value="streams">Transmisiones</TabsTrigger>
        </TabsList>
        <TabsContent value="videos">
          <AdminVideos />
        </TabsContent>
        <TabsContent value="clips">
          <AdminClips />
        </TabsContent>
        <TabsContent value="streams">
          <AdminStreams />
        </TabsContent>
      </Tabs>
    </section>
  )
}
