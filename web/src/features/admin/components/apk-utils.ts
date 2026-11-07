export const MAX_APK_BYTES = 150 * 1024 * 1024

/** Returns the user-facing rejection reason, or null when the file is acceptable. */
export function validateApk(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.apk')) return 'Solo se permiten archivos APK'
  if (file.size > MAX_APK_BYTES) return 'El archivo es demasiado grande (máximo 150MB)'
  return null
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
