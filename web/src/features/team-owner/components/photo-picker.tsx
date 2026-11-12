import { useRef, useState } from 'react'
import { AlertCircle, Upload } from 'lucide-react'

import { Label } from '@/components/ui/label'

const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface PhotoPickerProps {
  label: string
  /** Already saved photo, shown until the user picks a replacement. */
  currentUrl?: string
  disabled?: boolean
  onChange: (file: File | null) => void
}

/** Image picker with preview and validation; the caller uploads the file. */
export function PhotoPicker({ label, currentUrl, disabled, onChange }: PhotoPickerProps) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const clear = () => {
    setPhoto(null)
    setPreview(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) {
      setError('El tipo de archivo debe ser JPEG, PNG o WebP')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('El archivo no debe exceder 10 MB')
      return
    }
    setError(null)
    setPhoto(file)
    onChange(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(typeof ev.target?.result === 'string' ? ev.target.result : null)
    reader.readAsDataURL(file)
  }

  const shown = preview ?? currentUrl
  return (
    <div>
      <Label htmlFor="photo" className="text-white">{label}</Label>
      <div className="mt-2 space-y-3">
        {shown && (
          <div className="relative w-full max-w-xs">
            <img src={shown} alt="Vista previa" className="w-full h-auto rounded-lg border border-slate-600 max-h-64 object-cover" />
            {preview && (
              <button
                type="button"
                onClick={clear}
                aria-label="Quitar foto"
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                ×
              </button>
            )}
          </div>
        )}
        <input ref={inputRef} id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} disabled={disabled} className="hidden" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="w-full px-4 py-2 border-2 border-dashed border-slate-600 text-slate-300 rounded-lg hover:border-slate-400 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          {currentUrl ? 'Reemplazar imagen (JPEG, PNG, WebP - máx 10MB)' : 'Seleccionar imagen (JPEG, PNG, WebP - máx 10MB)'}
        </button>
        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-sm text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}
        {photo && <p className="text-sm text-green-400">✓ Foto seleccionada: {photo.name}</p>}
      </div>
    </div>
  )
}
