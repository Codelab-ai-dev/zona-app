import { createClientSupabaseClient } from "@/lib/supabase/client"

export interface UploadResult {
  publicUrl: string
  path: string
}

type BucketName = 'player-photos' | 'team-logos' | 'league-logos'

export class FileUploadService {
  private supabase = createClientSupabaseClient()

  /**
   * Sube un archivo a Supabase Storage
   * @param file - Archivo a subir
   * @param bucket - Nombre del bucket ('player-photos', 'team-logos', 'league-logos')
   * @param fileName - Nombre del archivo (sin extensión, se genera automáticamente)
   */
  async upload(file: File, bucket: BucketName, fileName: string): Promise<UploadResult> {
    try {
      // Obtener extensión del archivo
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${fileName}.${ext}`

      // Subir a Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: file.type,
          upsert: true // Reemplazar si existe
        })

      if (uploadError) {
        throw new Error(`Error subiendo archivo: ${uploadError.message}`)
      }

      // Obtener URL pública
      const { data: { publicUrl } } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      return {
        publicUrl,
        path
      }
    } catch (error) {
      console.error('File upload service error:', error)
      throw error
    }
  }

  /**
   * Sube foto de jugador
   */
  async uploadPlayerPhoto(file: File, playerId: string): Promise<UploadResult> {
    return this.upload(file, 'player-photos', playerId)
  }

  /**
   * Sube logo de equipo
   */
  async uploadTeamLogo(file: File, teamId: string): Promise<UploadResult> {
    return this.upload(file, 'team-logos', teamId)
  }

  /**
   * Sube logo de liga
   */
  async uploadLeagueLogo(file: File, leagueId: string): Promise<UploadResult> {
    return this.upload(file, 'league-logos', leagueId)
  }

  /**
   * Método legacy para compatibilidad - usa uploadTeamLogo
   * @deprecated Usar uploadTeamLogo, uploadPlayerPhoto o uploadLeagueLogo
   */
  async uploadLogo(file: File, path: string): Promise<UploadResult> {
    // Determinar bucket basado en el path
    if (path.includes('player')) {
      return this.uploadPlayerPhoto(file, path.replace(/[^a-zA-Z0-9-]/g, ''))
    }
    return this.uploadTeamLogo(file, path.replace(/[^a-zA-Z0-9-]/g, ''))
  }

  /**
   * Elimina un archivo del storage
   */
  async delete(bucket: BucketName, path: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([path])

      if (error) {
        console.warn('Error eliminando archivo:', error.message)
      }
    } catch (error) {
      console.warn('Delete file service error:', error)
    }
  }

  /**
   * Método legacy para compatibilidad
   * @deprecated Usar delete(bucket, path)
   */
  async deleteLogo(path: string): Promise<void> {
    // Intentar eliminar de ambos buckets
    await this.delete('team-logos', path)
    await this.delete('player-photos', path)
  }
}

export const fileUploadService = new FileUploadService()
