/**
 * Storage Service - Unified storage orchestrator
 *
 * Supports:
 * - Single provider mode (supabase, wasabi, or bunny)
 * - Dual-write mode (writes to both, reads from primary)
 *
 * Configuration via environment variables:
 * - STORAGE_PROVIDER: 'supabase' | 'wasabi' | 'bunny' | 'dual'
 * - STORAGE_DUAL_WRITE: 'true' | 'false'
 * - STORAGE_PRIMARY_READ: 'supabase' | 'wasabi' | 'bunny'
 */

import type { StorageProvider, BucketName, UploadOptions, UploadResult, StorageFile, StorageConfig } from './types'
import { SupabaseStorageProvider } from './supabase-provider'
import { WasabiStorageProvider } from './wasabi-provider'
import { BunnyStorageProvider } from './bunny-provider'

class StorageService {
  private supabase: StorageProvider | null = null
  private wasabi: StorageProvider | null = null
  private bunny: StorageProvider | null = null
  private _config: StorageConfig | null = null

  // Lazy initialization to ensure env vars are available
  private get config(): StorageConfig {
    if (!this._config) {
      const provider = (process.env.STORAGE_PROVIDER as StorageConfig['provider']) || 'supabase'
      const dualWrite = process.env.STORAGE_DUAL_WRITE === 'true'
      const primaryRead = (process.env.STORAGE_PRIMARY_READ as StorageConfig['primaryRead']) || 'supabase'

      this._config = {
        provider,
        dualWrite,
        primaryRead,
      }

      console.log(`[Storage] Initialized with provider=${provider}, dualWrite=${dualWrite}, primaryRead=${primaryRead}`)
    }
    return this._config
  }

  private getSupabase(): StorageProvider {
    if (!this.supabase) {
      this.supabase = new SupabaseStorageProvider()
    }
    return this.supabase
  }

  private getWasabi(): StorageProvider {
    if (!this.wasabi) {
      this.wasabi = new WasabiStorageProvider()
    }
    return this.wasabi
  }

  private getBunny(): StorageProvider {
    if (!this.bunny) {
      this.bunny = new BunnyStorageProvider()
    }
    return this.bunny
  }

  private getPrimaryProvider(): StorageProvider {
    if (this.config.provider === 'bunny') {
      return this.getBunny()
    }
    if (this.config.provider === 'wasabi') {
      return this.getWasabi()
    }
    if (this.config.provider === 'dual') {
      if (this.config.primaryRead === 'bunny') {
        return this.getBunny()
      }
      if (this.config.primaryRead === 'wasabi') {
        return this.getWasabi()
      }
      return this.getSupabase()
    }
    return this.getSupabase()
  }

  private getSecondaryProvider(): StorageProvider | null {
    if (this.config.provider === 'dual' || this.config.dualWrite) {
      if (this.config.primaryRead === 'bunny') {
        return this.getSupabase()
      }
      if (this.config.primaryRead === 'wasabi') {
        return this.getSupabase()
      }
      // Primary is supabase, return bunny or wasabi as secondary
      if (this.config.dualWrite) {
        return this.getBunny()
      }
      return null
    }
    return null
  }

  async upload(
    file: File | Buffer,
    bucket: BucketName,
    path: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const primary = this.getPrimaryProvider()
    const secondary = this.getSecondaryProvider()

    // If dual-write is enabled, write to both providers
    if (secondary && (this.config.dualWrite || this.config.provider === 'dual')) {
      const results = await Promise.allSettled([
        primary.upload(file, bucket, path, options),
        secondary.upload(file, bucket, path, options),
      ])

      // Log results for audit
      results.forEach((result, index) => {
        const providerName = index === 0 ? primary.name : secondary.name
        if (result.status === 'rejected') {
          console.error(`[Storage] ${providerName} upload failed:`, result.reason)
        } else {
          console.log(`[Storage] ${providerName} upload success: ${bucket}/${path}`)
        }
      })

      // Return result from primary provider
      if (results[0].status === 'fulfilled') {
        return results[0].value
      }

      // If primary failed, try to use secondary result
      if (results[1].status === 'fulfilled') {
        console.warn('[Storage] Primary failed, using secondary result')
        return results[1].value
      }

      throw new Error('Both storage providers failed')
    }

    // Single provider mode
    return primary.upload(file, bucket, path, options)
  }

  async delete(bucket: BucketName, path: string): Promise<void> {
    const primary = this.getPrimaryProvider()
    const secondary = this.getSecondaryProvider()

    if (secondary && (this.config.dualWrite || this.config.provider === 'dual')) {
      await Promise.allSettled([primary.delete(bucket, path), secondary.delete(bucket, path)])
    } else {
      await primary.delete(bucket, path)
    }
  }

  getPublicUrl(bucket: BucketName, path: string): string {
    return this.getPrimaryProvider().getPublicUrl(bucket, path)
  }

  async list(bucket: BucketName, prefix?: string): Promise<StorageFile[]> {
    return this.getPrimaryProvider().list(bucket, prefix)
  }

  async download(bucket: BucketName, path: string): Promise<Blob> {
    return this.getPrimaryProvider().download(bucket, path)
  }

  async exists(bucket: BucketName, path: string): Promise<boolean> {
    return this.getPrimaryProvider().exists(bucket, path)
  }

  /**
   * Get a specific provider instance (useful for migration scripts)
   */
  getProvider(name: 'supabase' | 'wasabi' | 'bunny'): StorageProvider {
    if (name === 'bunny') {
      return this.getBunny()
    }
    if (name === 'wasabi') {
      return this.getWasabi()
    }
    return this.getSupabase()
  }

  /**
   * Get current configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config }
  }
}

// Singleton instance
export const storageService = new StorageService()
