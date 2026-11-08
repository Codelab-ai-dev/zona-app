import { Smartphone } from 'lucide-react'
import type { ReactElement } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ReleasesList } from '@/features/admin/components/releases-list'

/** Read-only APK downloads of the admin's leagues (original header "App Móvil"). */
export function AppDownloadDialog({ leagues, trigger }: { leagues: { id: string; name: string }[]; trigger: ReactElement }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Smartphone className="h-5 w-5 text-green-400" aria-hidden="true" />
            Descargar App Móvil
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Descarga la aplicación móvil de Zona-Gol para tu dispositivo Android
          </DialogDescription>
        </DialogHeader>
        {leagues.map((league) => (
          <section key={league.id} aria-label={league.name} className="space-y-2">
            {leagues.length > 1 && <h3 className="text-sm font-medium text-white">{league.name}</h3>}
            <ReleasesList leagueId={league.id} readOnly />
          </section>
        ))}
      </DialogContent>
    </Dialog>
  )
}
