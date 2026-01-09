/**
 * Storage abstraction layer types
 * Supports multiple storage providers (Supabase, Wasabi S3)
 */

export type BucketName = 'player-photos' | 'team-logos' | 'league-logos' | 'app-releases'

export interface UploadOptions {
  contentType?: string
  upsert?: boolean
  cacheControl?: string
  metadata?: Record<string, string>
}

export interface UploadResult {
  publicUrl: string
  path: string
  provider: 'supabase' | 'wasabi' | 'bunny'
  etag?: string
}

export interface StorageFile {
  name: string
  path: string
  size: number
  contentType: string
  createdAt: string
  etag?: string
}

export interface StorageProvider {
  name: 'supabase' | 'wasabi' | 'bunny'
  upload(file: File | Buffer, bucket: BucketName, path: string, options?: UploadOptions): Promise<UploadResult>
  delete(bucket: BucketName, path: string): Promise<void>
  getPublicUrl(bucket: BucketName, path: string): string
  list(bucket: BucketName, prefix?: string): Promise<StorageFile[]>
  download(bucket: BucketName, path: string): Promise<Blob>
  exists(bucket: BucketName, path: string): Promise<boolean>
}

export interface StorageConfig {
  provider: 'supabase' | 'wasabi' | 'bunny' | 'dual'
  dualWrite: boolean
  primaryRead: 'supabase' | 'wasabi' | 'bunny'
}
