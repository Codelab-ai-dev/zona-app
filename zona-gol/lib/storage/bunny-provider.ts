/**
 * Bunny Storage Provider
 * Uses Bunny.net Storage API for file storage with CDN delivery
 */

import type { StorageProvider, BucketName, UploadOptions, UploadResult, StorageFile } from './types'

// Lazy getters for environment variables (to ensure they're available in Next.js)
const getConfig = () => ({
  storageZone: process.env.BUNNY_STORAGE_ZONE || '',
  apiKey: process.env.BUNNY_STORAGE_API_KEY || '',
  hostname: process.env.BUNNY_STORAGE_HOSTNAME || 'la.storage.bunnycdn.com',
  cdnUrl: process.env.BUNNY_CDN_URL || 'https://zonagol.b-cdn.net',
})

interface BunnyFile {
  Guid: string
  StorageZoneName: string
  Path: string
  ObjectName: string
  Length: number
  LastChanged: string
  ServerId: number
  ArrayNumber: number
  IsDirectory: boolean
  UserId: string
  ContentType: string
  DateCreated: string
  StorageZoneId: number
  Checksum: string
  ReplicatedZones: string
}

export class BunnyStorageProvider implements StorageProvider {
  name: 'bunny' = 'bunny'

  private getStorageUrl(folder: string, path: string): string {
    const config = getConfig()
    return `https://${config.hostname}/${config.storageZone}/${folder}/${path}`
  }

  private getHeaders(): HeadersInit {
    const config = getConfig()
    return {
      'AccessKey': config.apiKey,
    }
  }

  async upload(
    file: File | Buffer,
    bucket: BucketName,
    path: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const config = getConfig()
    if (!config.apiKey || !config.storageZone) {
      throw new Error(`Bunny Storage credentials not configured. BUNNY_STORAGE_ZONE=${config.storageZone ? 'set' : 'missing'}, BUNNY_STORAGE_API_KEY=${config.apiKey ? 'set' : 'missing'}`)
    }

    const url = this.getStorageUrl(bucket, path)

    let body: BodyInit
    let contentType = options?.contentType || 'application/octet-stream'

    if (Buffer.isBuffer(file)) {
      // Convert Buffer to Uint8Array for Blob compatibility
      const uint8Array = new Uint8Array(file.buffer, file.byteOffset, file.byteLength)
      body = new Blob([uint8Array as BlobPart])
    } else {
      // File object - can be used directly
      body = file
      contentType = file.type || contentType
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(),
        'Content-Type': contentType,
      },
      body,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Bunny upload failed: ${response.status} ${text}`)
    }

    const publicUrl = this.getPublicUrl(bucket, path)

    return {
      publicUrl,
      path: `${bucket}/${path}`,
      provider: 'bunny',
    }
  }

  async delete(bucket: BucketName, path: string): Promise<void> {
    const url = this.getStorageUrl(bucket, path)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!response.ok && response.status !== 404) {
      throw new Error(`Bunny delete failed: ${response.status}`)
    }
  }

  getPublicUrl(bucket: BucketName, path: string): string {
    const config = getConfig()
    return `${config.cdnUrl}/${bucket}/${path}`
  }

  async list(bucket: BucketName, prefix?: string): Promise<StorageFile[]> {
    const config = getConfig()
    const folderPath = prefix ? `${bucket}/${prefix}` : bucket
    const url = `https://${config.hostname}/${config.storageZone}/${folderPath}/`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      throw new Error(`Bunny list failed: ${response.status}`)
    }

    const files: BunnyFile[] = await response.json()

    return files
      .filter(f => !f.IsDirectory)
      .map(f => ({
        name: f.ObjectName,
        path: `${bucket}/${f.ObjectName}`,
        size: f.Length,
        contentType: f.ContentType || 'application/octet-stream',
        createdAt: f.DateCreated,
        etag: f.Checksum,
      }))
  }

  async download(bucket: BucketName, path: string): Promise<Blob> {
    const url = this.getStorageUrl(bucket, path)

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Bunny download failed: ${response.status}`)
    }

    return response.blob()
  }

  async exists(bucket: BucketName, path: string): Promise<boolean> {
    const url = this.getStorageUrl(bucket, path)

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: this.getHeaders(),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
