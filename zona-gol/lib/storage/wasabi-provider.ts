/**
 * Wasabi S3 Storage Provider
 * Uses AWS SDK v3 for S3-compatible Wasabi storage
 *
 * Structure: Single bucket with folder prefixes
 * - zona-gol/player-photos/{id}.jpg
 * - zona-gol/team-logos/{id}.png
 * - zona-gol/league-logos/{id}.webp
 * - zona-gol/app-releases/{leagueId}/{filename}.apk
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import type { StorageProvider, BucketName, UploadOptions, UploadResult, StorageFile } from './types'

export class WasabiStorageProvider implements StorageProvider {
  name = 'wasabi' as const
  private client: S3Client | null = null
  private bucketName: string
  private endpoint: string

  constructor() {
    const rawEndpoint = process.env.WASABI_ENDPOINT || 's3.us-west-2.wasabisys.com'
    this.endpoint = rawEndpoint.startsWith('https://') ? rawEndpoint : `https://${rawEndpoint}`
    this.bucketName = process.env.WASABI_BUCKET_NAME || process.env.WASABI_BUCKET || 'zona-gol'
  }

  private getClient(): S3Client {
    if (!this.client) {
      // Support both naming conventions
      const accessKeyId = process.env.WASABI_ACCESS_KEY_ID || process.env.WASABI_ACCESS_KEY
      const secretAccessKey = process.env.WASABI_SECRET_ACCESS_KEY || process.env.WASABI_SECRET_KEY

      if (!accessKeyId || !secretAccessKey) {
        throw new Error('Wasabi credentials not configured. Set WASABI_ACCESS_KEY (or WASABI_ACCESS_KEY_ID) and WASABI_SECRET_KEY (or WASABI_SECRET_ACCESS_KEY)')
      }

      this.client = new S3Client({
        region: process.env.WASABI_REGION || 'us-west-2',
        endpoint: this.endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true, // Required for Wasabi
      })
    }
    return this.client
  }

  /**
   * Converts bucket name to folder path
   * e.g., 'player-photos' -> 'player-photos/'
   */
  private getKeyPath(bucket: BucketName, path: string): string {
    return `${bucket}/${path}`
  }

  async upload(
    file: File | Buffer,
    bucket: BucketName,
    path: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const client = this.getClient()
    const key = this.getKeyPath(bucket, path)

    // Convert File to Buffer if needed
    const body = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file

    const upload = new Upload({
      client,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: options?.contentType || 'application/octet-stream',
        CacheControl: options?.cacheControl || 'public, max-age=31536000',
        Metadata: options?.metadata,
        ACL: 'public-read', // Make files publicly readable
      },
    })

    const result = await upload.done()

    return {
      publicUrl: this.getPublicUrl(bucket, path),
      path,
      provider: 'wasabi',
      etag: result.ETag?.replace(/"/g, ''),
    }
  }

  async delete(bucket: BucketName, path: string): Promise<void> {
    const client = this.getClient()
    const key = this.getKeyPath(bucket, path)

    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      )
    } catch (error) {
      console.warn('Wasabi delete error:', error)
    }
  }

  getPublicUrl(bucket: BucketName, path: string): string {
    const key = this.getKeyPath(bucket, path)
    return `${this.endpoint}/${this.bucketName}/${key}`
  }

  async list(bucket: BucketName, prefix?: string): Promise<StorageFile[]> {
    const client = this.getClient()
    const fullPrefix = prefix ? `${bucket}/${prefix}` : `${bucket}/`

    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: fullPrefix,
      })
    )

    return (result.Contents || []).map((obj) => {
      const fullPath = obj.Key || ''
      // Remove the bucket prefix to get the relative path
      const relativePath = fullPath.replace(`${bucket}/`, '')

      return {
        name: relativePath.split('/').pop() || '',
        path: relativePath,
        size: obj.Size || 0,
        contentType: '', // S3 ListObjects doesn't return content type
        createdAt: obj.LastModified?.toISOString() || '',
        etag: obj.ETag?.replace(/"/g, ''),
      }
    })
  }

  async download(bucket: BucketName, path: string): Promise<Blob> {
    const client = this.getClient()
    const key = this.getKeyPath(bucket, path)

    const result = await client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    )

    const bytes = await result.Body?.transformToByteArray()
    if (!bytes) throw new Error('Failed to download file')

    return new Blob([Buffer.from(bytes)], { type: result.ContentType || 'application/octet-stream' })
  }

  async exists(bucket: BucketName, path: string): Promise<boolean> {
    const client = this.getClient()
    const key = this.getKeyPath(bucket, path)

    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      )
      return true
    } catch {
      return false
    }
  }
}
