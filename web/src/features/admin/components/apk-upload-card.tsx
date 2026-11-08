import { useState } from 'react'
import { FileArchive, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { useUploadStorage } from '../api'
import type { League } from '../types'
import { formatFileSize, validateApk } from './apk-utils'

interface ApkUploadCardProps {
  leagues: League[]
  leagueId: string
  onLeagueChange: (id: string) => void
}

/** League picker + APK file input + upload button (scope app_releases). */
export function ApkUploadCard({ leagues, leagueId, onLeagueChange }: ApkUploadCardProps) {
  const upload = useUploadStorage()
  const [file, setFile] = useState<File | null>(null)
  const [inputKey, setInputKey] = useState(0)

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]
    if (!picked) return
    const problem = validateApk(picked)
    if (problem) {
      toast.error(problem)
      setFile(null)
      setInputKey((k) => k + 1)
      return
    }
    setFile(picked)
  }

  const handleUpload = async () => {
    if (!file || !leagueId) return
    const body = new FormData()
    body.append('file', file)
    body.append('scope', 'app_releases')
    body.append('scope_id', leagueId)
    try {
      await upload.mutateAsync(body)
      toast.success('APK subido exitosamente')
      setFile(null)
      setInputKey((k) => k + 1)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al subir el archivo')
    }
  }

  return (
    <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4 md:p-6 space-y-5">
      <h3 className="text-sm md:text-base font-semibold text-white">Subir APK</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="league-select" className="text-gray-400 text-sm">Seleccionar Liga *</Label>
          <Select value={leagueId} onValueChange={onLeagueChange}>
            <SelectTrigger id="league-select" className="w-full bg-slate-700/50 border-white/10 text-white">
              <SelectValue placeholder="Elige una liga" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {leagues.map((league) => (
                <SelectItem key={league.id} value={league.id} className="text-white hover:bg-slate-800">
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {leagueId && (
          <>
            <div className="space-y-2 pt-3 border-t border-white/10">
              <Label htmlFor="apk-upload" className="text-gray-400 text-sm flex items-center gap-1">
                <FileArchive className="h-3.5 w-3.5" aria-hidden="true" />
                Seleccionar APK (máx. 150MB) *
              </Label>
              <Input
                key={inputKey}
                id="apk-upload"
                type="file"
                accept=".apk"
                onChange={handleFile}
                disabled={upload.isPending}
                className="bg-slate-700/50 border-white/10 text-white file:text-gray-400 file:bg-slate-600/50 file:border-0 file:rounded file:px-2 file:py-1 file:mr-3"
              />
              {file && (
                <div className="mt-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="font-medium text-white text-sm">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              )}
            </div>
            <Button onClick={handleUpload} disabled={upload.isPending || !file} className="w-full bg-green-500 hover:bg-green-600 text-white border-0">
              {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {upload.isPending ? 'Subiendo…' : 'Subir APK'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
