import { useState } from 'react'
import { FileArchive, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <Card>
      <CardHeader>
        <CardTitle>Subir APK</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="league-select">Seleccionar Liga *</Label>
          <Select value={leagueId} onValueChange={onLeagueChange}>
            <SelectTrigger id="league-select">
              <SelectValue placeholder="Elige una liga" />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((league) => (
                <SelectItem key={league.id} value={league.id}>
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {leagueId && (
          <>
            <div>
              <Label htmlFor="apk-upload" className="flex items-center gap-1">
                <FileArchive className="h-4 w-4" aria-hidden="true" />
                Seleccionar APK (máx. 150MB) *
              </Label>
              <Input
                key={inputKey}
                id="apk-upload"
                type="file"
                accept=".apk"
                onChange={handleFile}
                disabled={upload.isPending}
              />
              {file && (
                <div className="mt-2 rounded-lg border bg-muted p-3 text-sm">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              )}
            </div>
            <Button onClick={handleUpload} disabled={upload.isPending || !file} className="w-full">
              {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {upload.isPending ? 'Subiendo…' : 'Subir APK'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
