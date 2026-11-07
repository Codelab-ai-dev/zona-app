import { useState } from 'react'
import { Smartphone } from 'lucide-react'
import { QueryState } from '@/components/states'
import { useAdminLeagues } from '../api'
import { ApkUploadCard } from './apk-upload-card'

/** Upload-only variant of the APK screen (no release listing). */
export function AppManagement() {
  const leagues = useAdminLeagues({ limit: 100 })
  const [leagueId, setLeagueId] = useState('')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Smartphone className="h-5 w-5" aria-hidden="true" />
          Gestión de Aplicación Móvil
        </h2>
        <p className="text-sm text-muted-foreground">Administra las versiones del APK</p>
      </div>

      <QueryState query={leagues} loadingLabel="Cargando ligas…" isEmpty={(res) => res.data.length === 0}>
        {(res) => <ApkUploadCard leagues={res.data} leagueId={leagueId} onLeagueChange={setLeagueId} />}
      </QueryState>
    </div>
  )
}
