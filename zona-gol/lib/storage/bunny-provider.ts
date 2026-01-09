/**
 * Bunny Storage Provider
 * Uses Bunny.net Storage API for file storage with CDN delivery
 */

import type { StorageProvider, BucketName, UploadOptions, UploadResult, StorageFile } from './types'

// Bunny Storage configuration
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || ''
const BUNNY_API_KEY = process.env.BUNNY_STORAGE_API_KEY || ''
const BUNNY_HOSTNAME = process.env.BUNNY_STORAGE_HOSTNAME || 'la.storage.bunnycdn.com'
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL || 'https://zonagol.b-cdn.net'

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
    return `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${folder}/${path}`
  }

  private getHeaders(): HeadersInit {
    return {
      'AccessKey': BUNNY_API_KEY,
    }
  }

  async upload(
    file: File | Buffer,
    bucket: BucketName,
    path: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    if (!BUNNY_API_KEY || !BUNNY_STORAGE_ZONE) {
      throw new Error('Bunny Storage credentials not configured')
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
    return `${BUNNY_CDN_URL}/${bucket}/${path}`
  }

  async list(bucket: BucketName, prefix?: string): Promise<StorageFile[]> {
    const folderPath = prefix ? `${bucket}/${prefix}` : bucket
    const url = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${folderPath}/`

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
