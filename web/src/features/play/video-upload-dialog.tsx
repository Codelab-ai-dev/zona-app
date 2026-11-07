import { useState, useRef, useCallback } from 'react'
import { Upload, AlertCircle, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useMyLeagues } from '@/features/leagues/api'
import { useCreateRecording, useRefreshRecording } from './api'
import { FileField, ProcessingPanel, UploadingPanel } from './upload-panels'
import type { Recording } from './types'

type UploadStatus = 'idle' | 'preparing' | 'uploading' | 'processing'

interface VideoUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VideoUploadDialog({ open, onOpenChange }: VideoUploadDialogProps) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [leagueId, setLeagueId] = useState('')
  const [matchId, setMatchId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const [uploadedRecording, setUploadedRecording] = useState<Recording | null>(null)

  const leagues = useMyLeagues()
  const createRecording = useCreateRecording()
  const refreshRecording = useRefreshRecording()

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        // Validar que sea video
        if (!file.type.startsWith('video/')) {
          setError('Por favor selecciona un archivo de video')
          return
        }
        // Validar tamaño (max 5GB)
        if (file.size > 5 * 1024 * 1024 * 1024) {
          setError('El archivo es muy grande. Máximo 5GB.')
          return
        }
        setSelectedFile(file)
        setError(null)
        // Auto-generar título si está vacío
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''))
        }
      }
    },
    [title],
  )

  const handleUpload = async () => {
    if (!selectedFile || !title || !leagueId) {
      setError('Selecciona un archivo, liga y escribe un título')
      return
    }

    try {
      setStatus('preparing')
      setProgress(0)

      // 1. Crear recording y obtener URL de upload
      const { upload, recording } = await createRecording.mutateAsync({
        title,
        description: description || undefined,
        league_id: leagueId,
        match_id: matchId || undefined,
        source_type: 'manual',
      })

      setUploadedRecording(recording)
      setStatus('uploading')

      // 2. Subir video directamente a Mux
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100)
            setProgress(percent)
          }
        }

        xhr.onload = () => {
          xhrRef.current = null
          if (xhr.status >= 200 && xhr.status < 300) {
            setStatus('processing')
            setProgress(100)
            resolve()
          } else {
            reject(new Error('Error al subir video'))
          }
        }

        xhr.onerror = () => {
          xhrRef.current = null
          reject(new Error('Error de red al subir el video'))
        }

        xhr.onabort = () => {
          xhrRef.current = null
          reject(new Error('Upload cancelado'))
        }

        xhr.open('PUT', upload.url)
        xhr.setRequestHeader('Content-Type', selectedFile.type)
        xhr.send(selectedFile)
      })

      // 3. Trigger refresh to check processing status
      refreshRecording.mutate(recording.id)
    } catch (err) {
      // Back to the form (values kept) so the user can retry.
      setStatus('idle')
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  const handleCancel = () => {
    if (xhrRef.current) {
      xhrRef.current.abort()
    }
  }

  const resetForm = () => {
    setStatus('idle')
    setProgress(0)
    setError(null)
    setTitle('')
    setDescription('')
    setLeagueId('')
    setMatchId('')
    setSelectedFile(null)
    setUploadedRecording(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && status === 'idle') {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Subir Video</DialogTitle>
          <DialogDescription>
            Sube un video de un partido para que aparezca en Zona Play
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {status === 'idle' && (
            <>
              <FileField inputRef={fileInputRef} file={selectedFile} onChange={handleFileSelect} />

              {/* League */}
              <div className="space-y-2">
                <Label htmlFor="league">Liga *</Label>
                <Select value={leagueId} onValueChange={setLeagueId}>
                  <SelectTrigger id="league">
                    <SelectValue placeholder="Selecciona una liga" />
                  </SelectTrigger>
                  <SelectContent>
                    {leagues.data?.data.map((league) => (
                      <SelectItem key={league.id} value={league.id}>
                        {league.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Liga Premier - Jornada 15"
                />
              </div>

              {/* Match (optional) */}
              <div className="space-y-2">
                <Label htmlFor="match">Partido (opcional)</Label>
                <Input
                  id="match"
                  value={matchId}
                  forceLowercase
                  onChange={(e) => setMatchId(e.target.value)}
                  placeholder="ID del partido"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el partido..."
                  rows={3}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p role="alert">{error}</p>
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !title || !leagueId}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                Subir Video
              </Button>
            </>
          )}

          {status === 'preparing' && (
            <div className="flex items-center justify-center gap-2 py-8" role="status">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Preparando…</span>
            </div>
          )}

          {status === 'uploading' && <UploadingPanel progress={progress} onCancel={handleCancel} />}

          {status === 'processing' && (
            <ProcessingPanel
              recordingId={uploadedRecording?.id}
              onClose={() => {
                resetForm()
                onOpenChange(false)
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
