import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const MAX_BYTES = 2 * 1024 * 1024

interface Props {
  /** Logo already stored for the team, shown until a new file is chosen. */
  currentUrl?: string
  /** Initials shown when there is no logo. */
  fallback: string
  disabled?: boolean
  onChange: (file: File | null) => void
}

/** Round logo picker (images up to 2 MB). The caller uploads the chosen file. */
export function LogoPicker({ currentUrl, fallback, disabled, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const choose = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('El archivo debe ser una imagen')
    if (file.size > MAX_BYTES) return setError('La imagen no debe exceder 2 MB')
    setError(null)
    setPreview(URL.createObjectURL(file))
    onChange(file)
  }

  const clear = () => {
    setPreview(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const shown = preview ?? currentUrl
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar className="h-20 w-20 border border-white/20">
          {shown && <AvatarImage src={shown} alt="Logo del equipo" />}
          <AvatarFallback className="bg-green-500/20 text-lg font-bold text-green-400">{fallback || '?'}</AvatarFallback>
        </Avatar>
        {preview && (
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            aria-label="Quitar logo seleccionado"
            className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Logo del equipo"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => choose(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 disabled:opacity-50"
      >
        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
        {shown ? 'Cambiar logo' : 'Subir logo'} (máx. 2 MB)
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
