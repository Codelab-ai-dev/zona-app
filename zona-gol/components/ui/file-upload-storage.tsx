"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, X, ImageIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BucketName } from "@/lib/storage"

interface FileUploadStorageProps {
  label?: string
  accept?: string
  maxSize?: number // in MB
  preview?: boolean
  value?: string // URL of existing file
  bucket: BucketName
  fileId: string // Unique ID for the file (e.g., playerId, teamId)
  onChange?: (url: string | null) => void
  onUploadStart?: () => void
  onUploadEnd?: () => void
  className?: string
  variant?: "default" | "avatar"
}

export function FileUploadStorage({
  label = "Subir archivo",
  accept = "image/*",
  maxSize = 5,
  preview = true,
  value,
  bucket,
  fileId,
  onChange,
  onUploadStart,
  onUploadEnd,
  className,
  variant = "default",
}: FileUploadStorageProps) {
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona un archivo de imagen válido")
      return
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`El archivo debe ser menor a ${maxSize}MB`)
      return
    }

    try {
      setUploading(true)
      onUploadStart?.()

      // Create preview immediately
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload via API route (server-side handles storage provider)
      console.log(`[FileUploadStorage] Uploading to ${bucket}/${fileId}...`)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucket)
      formData.append('fileId', fileId)

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir archivo')
      }

      console.log(`[FileUploadStorage] Upload successful: ${result.publicUrl}`)

      // Update preview with actual URL
      setPreviewUrl(result.publicUrl)
      onChange?.(result.publicUrl)

    } catch (err: any) {
      console.error('[FileUploadStorage] Upload failed:', err)
      setError(err.message || 'Error al subir archivo')
      setPreviewUrl(null)
      onChange?.(null)
    } finally {
      setUploading(false)
      onUploadEnd?.()
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const clearFile = async () => {
    // Optionally delete from storage here
    setPreviewUrl(null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
    onChange?.(null)
  }

  if (variant === "avatar") {
    return (
      <div className={cn("flex flex-col items-center space-y-2", className)}>
        <div className="relative">
          <Avatar className="w-20 h-20 cursor-pointer" onClick={() => !uploading && inputRef.current?.click()}>
            {uploading ? (
              <AvatarFallback className="bg-gray-100">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </AvatarFallback>
            ) : previewUrl ? (
              <AvatarImage src={previewUrl} alt="Preview" />
            ) : (
              <AvatarFallback className="bg-gray-100">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </AvatarFallback>
            )}
          </Avatar>
          {previewUrl && !uploading && (
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
              onClick={clearFile}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {previewUrl ? "Cambiar" : "Subir"}
            </>
          )}
        </Button>
        <Input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" disabled={uploading} />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-gray-300",
          uploading ? "opacity-50 cursor-not-allowed" : "hover:border-gray-400 cursor-pointer",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
            <p className="text-sm font-medium text-gray-900">Subiendo imagen...</p>
          </div>
        ) : preview && previewUrl ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-32 max-h-32 rounded-lg object-cover mx-auto"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  clearFile()
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-gray-600">Haz clic para cambiar la imagen</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-8 h-8 text-gray-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-900">Haz clic para subir o arrastra y suelta</p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF hasta {maxSize}MB</p>
            </div>
          </div>
        )}
      </div>
      <Input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" disabled={uploading} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
