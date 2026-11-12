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
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 md:p-2.5 rounded-lg bg-green-500/20">
          <Smartphone className="w-5 h-5 md:w-6 md:h-6 text-green-400" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white">Gestión de Aplicación Móvil</h2>
          <p className="text-gray-500 text-sm">Administra las versiones del APK</p>
        </div>
      </div>

      <QueryState query={leagues} loadingLabel="Cargando ligas…" isEmpty={(res) => res.data.length === 0}>
        {(res) => <ApkUploadCard leagues={res.data} leagueId={leagueId} onLeagueChange={setLeagueId} />}
      </QueryState>
    </div>
  )
}
