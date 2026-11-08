import { ChevronLeft, Video } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { AdminClips } from './admin-clips'
import { AdminStreams } from './admin-streams'
import { AdminVideos } from './admin-videos'

export function AdminPage() {
  return (
    <section className="zona-play container mx-auto max-w-screen-xl space-y-6 rounded-xl border border-white/10 bg-background px-6 py-8 text-foreground">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/play" aria-label="Volver a Zona Play">
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Zona Play Admin</h1>
          <p className="text-muted-foreground">Gestiona tus videos, clips y transmisiones</p>
        </div>
      </header>

      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="w-4 h-4" aria-hidden="true" />
            Videos
          </TabsTrigger>
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
