import { storageService, type BucketName } from '@/lib/storage'

export interface UploadResult {
  publicUrl: string
  path: string
}

export class FileUploadService {
  /**
   * Sube un archivo al storage (Supabase, Wasabi, o ambos según configuración)
   * @param file - Archivo a subir
   * @param bucket - Nombre del bucket ('player-photos', 'team-logos', 'league-logos', 'app-releases')
   * @param fileName - Nombre del archivo (sin extensión, se genera automáticamente)
   */
  async upload(file: File, bucket: BucketName, fileName: string): Promise<UploadResult> {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${fileName}.${ext}`

      const result = await storageService.upload(file, bucket, path, {
        contentType: file.type,
        upsert: true,
      })

      return {
        publicUrl: result.publicUrl,
        path: result.path,
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
      await storageService.delete(bucket, path)
    } catch (error) {
      console.warn('Delete file service error:', error)
    }
  }

  /**
   * Método legacy para compatibilidad
   * @deprecated Usar delete(bucket, path)
   */
  async deleteLogo(path: string): Promise<void> {
    await Promise.allSettled([
      storageService.delete('team-logos', path),
      storageService.delete('player-photos', path),
    ])
  }
}

export const fileUploadService = new FileUploadService()
