"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, X, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  label?: string
  accept?: string
  maxSize?: number // in MB
  preview?: boolean
  value?: string
  onChange?: (file: File | null, dataUrl?: string) => void
  className?: string
  variant?: "default" | "avatar"
}

export function FileUpload({
  label = "Subir archivo",
  accept = "image/*",
  maxSize = 5,
  preview = true,
  value,
  onChange,
  className,
  variant = "default",
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
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

    // Create preview URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPreviewUrl(dataUrl)
      onChange?.(file, dataUrl)
    }
    reader.readAsDataURL(file)
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

  const clearFile = () => {
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
          <Avatar className="w-20 h-20 cursor-pointer" onClick={() => inputRef.current?.click()}>
            {previewUrl ? (
              <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Preview" />
            ) : (
              <AvatarFallback className="bg-gray-100">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </AvatarFallback>
            )}
          </Avatar>
          {previewUrl && (
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
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" />
          {previewUrl ? "Cambiar" : "Subir"}
        </Button>
        <Input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-gray-300",
          "hover:border-gray-400 cursor-pointer",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {preview && previewUrl ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img
                src={previewUrl || "/placeholder.svg"}
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
      <Input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
