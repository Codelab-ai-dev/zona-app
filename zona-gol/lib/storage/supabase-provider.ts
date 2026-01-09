/**
 * Supabase Storage Provider
 * Wrapper around Supabase Storage for the storage abstraction layer
 */

import { createClientSupabaseClient } from '@/lib/supabase/client'
import type { StorageProvider, BucketName, UploadOptions, UploadResult, StorageFile } from './types'

export class SupabaseStorageProvider implements StorageProvider {
  name = 'supabase' as const

  private getSupabase() {
    return createClientSupabaseClient()
  }

  async upload(
    file: File | Buffer,
    bucket: BucketName,
    path: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const supabase = this.getSupabase()

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? true,
      cacheControl: options?.cacheControl,
    })

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`)
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path)

    return {
      publicUrl,
      path,
      provider: 'supabase',
    }
  }

  async delete(bucket: BucketName, path: string): Promise<void> {
    const supabase = this.getSupabase()
    const { error } = await supabase.storage.from(bucket).remove([path])
    if (error) {
      console.warn('Supabase delete error:', error.message)
    }
  }

  getPublicUrl(bucket: BucketName, path: string): string {
    const supabase = this.getSupabase()
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path)
    return publicUrl
  }

  async list(bucket: BucketName, prefix?: string): Promise<StorageFile[]> {
    const supabase = this.getSupabase()
    const { data, error } = await supabase.storage.from(bucket).list(prefix || '', {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (error) throw new Error(error.message)

    return (data || [])
      .filter((file) => file.id !== null) // Filter out folders
      .map((file) => ({
        name: file.name,
        path: prefix ? `${prefix}/${file.name}` : file.name,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || '',
        createdAt: file.created_at || '',
      }))
  }

  async download(bucket: BucketName, path: string): Promise<Blob> {
    const supabase = this.getSupabase()
    const { data, error } = await supabase.storage.from(bucket).download(path)
    if (error) throw new Error(error.message)
    return data
  }

  async exists(bucket: BucketName, path: string): Promise<boolean> {
    try {
      const supabase = this.getSupabase()
      // Try to get file metadata by listing with the exact path
      const folderPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : ''
      const fileName = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path

      const { data } = await supabase.storage.from(bucket).list(folderPath, {
        search: fileName,
      })
      return data?.some((f) => f.name === fileName) ?? false
    } catch {
      return false
    }
  }
}
