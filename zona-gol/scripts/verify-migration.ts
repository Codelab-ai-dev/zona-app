#!/usr/bin/env npx tsx
/**
 * Verify migration: compare files in Supabase vs Wasabi
 *
 * Usage:
 *   pnpm tsx scripts/verify-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import { S3Client, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

const BUCKETS = ['player-photos', 'team-logos', 'league-logos', 'app-releases']

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

interface VerifyStats {
  bucket: string
  supabaseCount: number
  wasabiCount: number
  matching: number
  missingInWasabi: string[]
  missingInSupabase: string[]
}

async function getWasabiFiles(prefix: string): Promise<Set<string>> {
  const files = new Set<string>()

  let continuationToken: string | undefined

  do {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: WASABI_BUCKET,
      Prefix: prefix + '/',
      ContinuationToken: continuationToken,
    }))

    for (const obj of response.Contents || []) {
      if (obj.Key) {
        // Remove prefix to get just filename
        const fileName = obj.Key.replace(prefix + '/', '')
        if (fileName) files.add(fileName)
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return files
}

async function getSupabaseFiles(bucket: string): Promise<Set<string>> {
  const files = new Set<string>()

  const { data, error } = await supabase.storage
    .from(bucket)
    .list('', { limit: 1000 })

  if (error) {
    console.error(`Error listing Supabase bucket ${bucket}: ${error.message}`)
    return files
  }

  for (const file of data || []) {
    if (file.metadata !== null && file.name !== '.emptyFolderPlaceholder') {
      files.add(file.name)
    }
  }

  return files
}

async function verifyBucket(bucket: string): Promise<VerifyStats> {
  console.log(`\n🔍 Verifying bucket: ${bucket}`)

  const [supabaseFiles, wasabiFiles] = await Promise.all([
    getSupabaseFiles(bucket),
    getWasabiFiles(bucket),
  ])

  const stats: VerifyStats = {
    bucket,
    supabaseCount: supabaseFiles.size,
    wasabiCount: wasabiFiles.size,
    matching: 0,
    missingInWasabi: [],
    missingInSupabase: [],
  }

  // Check which files are in Supabase but not Wasabi
  for (const file of supabaseFiles) {
    if (wasabiFiles.has(file)) {
      stats.matching++
    } else {
      stats.missingInWasabi.push(file)
    }
  }

  // Check which files are in Wasabi but not Supabase
  for (const file of wasabiFiles) {
    if (!supabaseFiles.has(file)) {
      stats.missingInSupabase.push(file)
    }
  }

  console.log(`  Supabase: ${stats.supabaseCount} files`)
  console.log(`  Wasabi: ${stats.wasabiCount} files`)
  console.log(`  Matching: ${stats.matching}`)

  if (stats.missingInWasabi.length > 0) {
    console.log(`  ⚠️  Missing in Wasabi: ${stats.missingInWasabi.length}`)
    if (stats.missingInWasabi.length <= 10) {
      stats.missingInWasabi.forEach(f => console.log(`      - ${f}`))
    }
  }

  if (stats.missingInSupabase.length > 0) {
    console.log(`  ℹ️  Extra in Wasabi (not in Supabase): ${stats.missingInSupabase.length}`)
  }

  return stats
}

async function main() {
  console.log('🔍 Migration Verification Script')
  console.log(`   Wasabi bucket: ${WASABI_BUCKET}`)

  // Verify environment
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const hasWasabiAccess = process.env.WASABI_ACCESS_KEY_ID || process.env.WASABI_ACCESS_KEY
  const hasWasabiSecret = process.env.WASABI_SECRET_ACCESS_KEY || process.env.WASABI_SECRET_KEY

  const missing = requiredVars.filter(v => !process.env[v])
  if (!hasWasabiAccess) missing.push('WASABI_ACCESS_KEY')
  if (!hasWasabiSecret) missing.push('WASABI_SECRET_KEY')
  if (missing.length > 0) {
    console.error(`\n❌ Missing environment variables: ${missing.join(', ')}`)
    process.exit(1)
  }

  const allStats: VerifyStats[] = []

  for (const bucket of BUCKETS) {
    allStats.push(await verifyBucket(bucket))
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Verification Summary')
  console.log('='.repeat(60))

  let totalMissing = 0

  for (const stats of allStats) {
    const status = stats.missingInWasabi.length === 0 ? '✅' : '⚠️'
    console.log(`\n${status} ${stats.bucket}:`)
    console.log(`   Supabase: ${stats.supabaseCount} | Wasabi: ${stats.wasabiCount} | Matching: ${stats.matching}`)
    if (stats.missingInWasabi.length > 0) {
      console.log(`   Missing in Wasabi: ${stats.missingInWasabi.length}`)
    }
    totalMissing += stats.missingInWasabi.length
  }

  console.log('\n' + '-'.repeat(60))

  if (totalMissing === 0) {
    console.log('✅ All files have been migrated successfully!')
  } else {
    console.log(`⚠️  ${totalMissing} files are missing in Wasabi. Run migrate-to-wasabi.ts again.`)
    process.exit(1)
  }
}

main().catch(console.error)
