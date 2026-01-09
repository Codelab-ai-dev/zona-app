#!/usr/bin/env npx tsx
/**
 * Migration script: Supabase Storage → Wasabi S3
 *
 * Usage:
 *   pnpm tsx scripts/migrate-to-wasabi.ts
 *
 * Environment variables required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - WASABI_ACCESS_KEY_ID
 *   - WASABI_SECRET_ACCESS_KEY
 *   - WASABI_BUCKET_NAME
 *   - WASABI_REGION (default: us-east-1)
 *   - WASABI_ENDPOINT (default: https://s3.us-east-1.wasabisys.com)
 */

import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

// Configuration
const BUCKETS_TO_MIGRATE = ['player-photos', 'team-logos', 'league-logos', 'app-releases']
const BATCH_SIZE = 10
const DRY_RUN = process.argv.includes('--dry-run')

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const wasabiEndpoint = process.env.WASABI_ENDPOINT?.startsWith('https://')
  ? process.env.WASABI_ENDPOINT
  : `https://${process.env.WASABI_ENDPOINT || 's3.us-west-2.wasabisys.com'}`

const s3Client = new S3Client({
  region: process.env.WASABI_REGION || 'us-west-2',
  endpoint: wasabiEndpoint,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID || process.env.WASABI_ACCESS_KEY!,
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY || process.env.WASABI_SECRET_KEY!,
  },
  forcePathStyle: true,
})

const WASABI_BUCKET = process.env.WASABI_BUCKET_NAME || process.env.WASABI_BUCKET || 'zona-gol'

interface MigrationStats {
  total: number
  migrated: number
  skipped: number
  failed: number
  errors: string[]
}

async function fileExistsInWasabi(key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: WASABI_BUCKET,
      Key: key,
    }))
    return true
  } catch {
    return false
  }
}

async function migrateFile(
  supabaseBucket: string,
  filePath: string,
  stats: MigrationStats
): Promise<void> {
  const wasabiKey = `${supabaseBucket}/${filePath}`

  try {
    // Check if already exists in Wasabi
    if (await fileExistsInWasabi(wasabiKey)) {
      console.log(`  ⏭️  Skipping (exists): ${wasabiKey}`)
      stats.skipped++
      return
    }

    // Download from Supabase
    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .download(filePath)

    if (error || !data) {
      throw new Error(`Download failed: ${error?.message || 'No data'}`)
    }

    if (DRY_RUN) {
      console.log(`  🔍 Would migrate: ${wasabiKey} (${data.size} bytes)`)
      stats.migrated++
      return
    }

    // Upload to Wasabi
    const buffer = Buffer.from(await data.arrayBuffer())
    await s3Client.send(new PutObjectCommand({
      Bucket: WASABI_BUCKET,
      Key: wasabiKey,
      Body: buffer,
      ContentType: data.type || 'application/octet-stream',
      ACL: 'public-read',
    }))

    console.log(`  ✅ Migrated: ${wasabiKey} (${data.size} bytes)`)
    stats.migrated++
  } catch (error) {
    const msg = `Failed ${wasabiKey}: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`  ❌ ${msg}`)
    stats.failed++
    stats.errors.push(msg)
  }
}

async function migrateBucket(bucketName: string): Promise<MigrationStats> {
  const stats: MigrationStats = { total: 0, migrated: 0, skipped: 0, failed: 0, errors: [] }

  console.log(`\n📦 Migrating bucket: ${bucketName}`)

  // List all files in Supabase bucket
  const { data: files, error } = await supabase.storage
    .from(bucketName)
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

  if (error) {
    console.error(`  ❌ Error listing bucket: ${error.message}`)
    stats.errors.push(`Bucket ${bucketName}: ${error.message}`)
    return stats
  }

  if (!files || files.length === 0) {
    console.log(`  ℹ️  No files found in bucket`)
    return stats
  }

  // Filter out folders (they have null metadata)
  const actualFiles = files.filter(f => f.metadata !== null && f.name !== '.emptyFolderPlaceholder')
  stats.total = actualFiles.length
  console.log(`  Found ${stats.total} files to migrate`)

  // Process in batches
  for (let i = 0; i < actualFiles.length; i += BATCH_SIZE) {
    const batch = actualFiles.slice(i, i + BATCH_SIZE)
    console.log(`\n  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(actualFiles.length / BATCH_SIZE)}`)

    await Promise.all(batch.map(file => migrateFile(bucketName, file.name, stats)))
  }

  return stats
}

async function main() {
  console.log('🚀 Starting Supabase → Wasabi migration')
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '⚡ LIVE'}`)
  console.log(`   Wasabi bucket: ${WASABI_BUCKET}`)
  console.log(`   Buckets to migrate: ${BUCKETS_TO_MIGRATE.join(', ')}`)

  // Verify environment
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  // Check for either naming convention
  const hasWasabiAccess = process.env.WASABI_ACCESS_KEY_ID || process.env.WASABI_ACCESS_KEY
  const hasWasabiSecret = process.env.WASABI_SECRET_ACCESS_KEY || process.env.WASABI_SECRET_KEY

  const missing = requiredVars.filter(v => !process.env[v])
  if (!hasWasabiAccess) missing.push('WASABI_ACCESS_KEY')
  if (!hasWasabiSecret) missing.push('WASABI_SECRET_KEY')
  if (missing.length > 0) {
    console.error(`\n❌ Missing environment variables: ${missing.join(', ')}`)
    process.exit(1)
  }

  const allStats: Record<string, MigrationStats> = {}

  for (const bucket of BUCKETS_TO_MIGRATE) {
    allStats[bucket] = await migrateBucket(bucket)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Migration Summary')
  console.log('='.repeat(50))

  let totalFiles = 0, totalMigrated = 0, totalSkipped = 0, totalFailed = 0

  for (const [bucket, stats] of Object.entries(allStats)) {
    console.log(`\n${bucket}:`)
    console.log(`  Total: ${stats.total} | Migrated: ${stats.migrated} | Skipped: ${stats.skipped} | Failed: ${stats.failed}`)
    totalFiles += stats.total
    totalMigrated += stats.migrated
    totalSkipped += stats.skipped
    totalFailed += stats.failed
  }

  console.log('\n' + '-'.repeat(50))
  console.log(`TOTAL: ${totalFiles} files | ${totalMigrated} migrated | ${totalSkipped} skipped | ${totalFailed} failed`)

  if (totalFailed > 0) {
    console.log('\n⚠️  Some files failed to migrate. Review errors above.')
    process.exit(1)
  }

  console.log('\n✅ Migration completed successfully!')
}

main().catch(console.error)
