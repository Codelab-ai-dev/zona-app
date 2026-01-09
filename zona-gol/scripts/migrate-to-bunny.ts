#!/usr/bin/env npx tsx
/**
 * Migration script: Wasabi S3 → Bunny Storage
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'

const FOLDERS = ['player-photos', 'team-logos', 'league-logos', 'app-releases']
const DRY_RUN = process.argv.includes('--dry-run')

// Wasabi client
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

const WASABI_BUCKET = process.env.WASABI_BUCKET_NAME || process.env.WASABI_BUCKET || 'zonagol'

// Bunny Storage config
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE!
const BUNNY_API_KEY = process.env.BUNNY_STORAGE_API_KEY!
const BUNNY_HOSTNAME = process.env.BUNNY_STORAGE_HOSTNAME!

interface Stats {
  total: number
  migrated: number
  skipped: number
  failed: number
}

async function uploadToBunny(path: string, data: Buffer, contentType: string): Promise<boolean> {
  const url = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${path}`

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': contentType,
      },
      body: data,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text}`)
    }
    return true
  } catch (error) {
    console.error(`    ❌ Upload failed: ${error}`)
    return false
  }
}

async function checkExistsInBunny(path: string): Promise<boolean> {
  const url = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${path}`

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'AccessKey': BUNNY_API_KEY },
    })
    return response.ok
  } catch {
    return false
  }
}

async function migrateFolder(folder: string): Promise<Stats> {
  const stats: Stats = { total: 0, migrated: 0, skipped: 0, failed: 0 }

  console.log(`\n📦 Migrating folder: ${folder}`)

  // List files in Wasabi
  const listResponse = await s3Client.send(new ListObjectsV2Command({
    Bucket: WASABI_BUCKET,
    Prefix: `${folder}/`,
  }))

  const files = listResponse.Contents?.filter(f => f.Key && !f.Key.endsWith('/')) || []
  stats.total = files.length

  if (files.length === 0) {
    console.log(`  ℹ️  No files found`)
    return stats
  }

  console.log(`  Found ${files.length} files`)

  for (const file of files) {
    const key = file.Key!
    const fileName = key.replace(`${folder}/`, '')
    const bunnyPath = `${folder}/${fileName}`

    // Check if exists in Bunny
    if (await checkExistsInBunny(bunnyPath)) {
      console.log(`  ⏭️  Skipping (exists): ${bunnyPath}`)
      stats.skipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`  🔍 Would migrate: ${bunnyPath}`)
      stats.migrated++
      continue
    }

    // Download from Wasabi
    try {
      const getResponse = await s3Client.send(new GetObjectCommand({
        Bucket: WASABI_BUCKET,
        Key: key,
      }))

      const bytes = await getResponse.Body?.transformToByteArray()
      if (!bytes) throw new Error('No data')

      const contentType = getResponse.ContentType || 'application/octet-stream'

      // Upload to Bunny
      if (await uploadToBunny(bunnyPath, Buffer.from(bytes), contentType)) {
        console.log(`  ✅ Migrated: ${bunnyPath} (${bytes.length} bytes)`)
        stats.migrated++
      } else {
        stats.failed++
      }
    } catch (error) {
      console.error(`  ❌ Failed ${key}: ${error}`)
      stats.failed++
    }
  }

  return stats
}

async function main() {
  console.log('🚀 Starting Wasabi → Bunny Storage migration')
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ LIVE'}`)
  console.log(`   Wasabi bucket: ${WASABI_BUCKET}`)
  console.log(`   Bunny storage: ${BUNNY_STORAGE_ZONE}`)

  // Verify env
  if (!BUNNY_API_KEY || !BUNNY_STORAGE_ZONE || !BUNNY_HOSTNAME) {
    console.error('\n❌ Missing Bunny Storage credentials')
    process.exit(1)
  }

  const allStats: Record<string, Stats> = {}

  for (const folder of FOLDERS) {
    allStats[folder] = await migrateFolder(folder)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Migration Summary')
  console.log('='.repeat(50))

  let total = 0, migrated = 0, skipped = 0, failed = 0

  for (const [folder, stats] of Object.entries(allStats)) {
    console.log(`\n${folder}:`)
    console.log(`  Total: ${stats.total} | Migrated: ${stats.migrated} | Skipped: ${stats.skipped} | Failed: ${stats.failed}`)
    total += stats.total
    migrated += stats.migrated
    skipped += stats.skipped
    failed += stats.failed
  }

  console.log('\n' + '-'.repeat(50))
  console.log(`TOTAL: ${total} files | ${migrated} migrated | ${skipped} skipped | ${failed} failed`)

  if (failed > 0) {
    console.log('\n⚠️  Some files failed. Review errors above.')
    process.exit(1)
  }

  console.log('\n✅ Migration completed!')
  console.log(`\nCDN URL: ${process.env.BUNNY_CDN_URL}`)
}

main().catch(console.error)
