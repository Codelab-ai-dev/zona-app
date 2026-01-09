#!/usr/bin/env npx tsx
/**
 * Update database URLs from Supabase to Wasabi
 *
 * Usage:
 *   pnpm tsx scripts/update-urls-to-wasabi.ts
 *   pnpm tsx scripts/update-urls-to-wasabi.ts --dry-run
 *   pnpm tsx scripts/update-urls-to-wasabi.ts --revert  (to switch back to Supabase)
 *
 * Updates URLs in:
 *   - leagues.logo
 *   - teams.logo
 *   - players.photo
 *   - players.id_document_url
 *   - coaching_staff.photo
 */

import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')
const REVERT = process.argv.includes('--revert')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// URL patterns
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const WASABI_REGION = process.env.WASABI_REGION || 'us-west-2'
const WASABI_BUCKET = process.env.WASABI_BUCKET_NAME || process.env.WASABI_BUCKET || 'zona-gol'
const WASABI_BASE = `https://s3.${WASABI_REGION}.wasabisys.com/${WASABI_BUCKET}`

// Tables and columns to update
const TABLES_TO_UPDATE = [
  { table: 'leagues', column: 'logo', bucket: 'league-logos' },
  { table: 'teams', column: 'logo', bucket: 'team-logos' },
  { table: 'players', column: 'photo', bucket: 'player-photos' },
  { table: 'players', column: 'id_document_url', bucket: 'player-photos' },
  { table: 'coaching_staff', column: 'photo', bucket: 'player-photos' },
]

interface UpdateStats {
  table: string
  column: string
  total: number
  updated: number
  skipped: number
  failed: number
}

function transformUrl(url: string, bucket: string, toWasabi: boolean): string | null {
  if (!url) return null

  if (toWasabi) {
    // Supabase → Wasabi
    // From: https://supabase.../storage/v1/object/public/bucket/file.jpg
    // To: https://s3.region.wasabisys.com/zona-gol/bucket/file.jpg
    const supabasePattern = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/
    const match = url.match(supabasePattern)
    if (match) {
      const [, , filePath] = match
      return `${WASABI_BASE}/${bucket}/${filePath}`
    }
  } else {
    // Wasabi → Supabase (revert)
    const wasabiPattern = new RegExp(`${WASABI_BASE}/${bucket}/(.+)$`)
    const match = url.match(wasabiPattern)
    if (match) {
      const [, filePath] = match
      return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`
    }
  }

  return null // URL doesn't match expected pattern
}

async function updateTable(config: typeof TABLES_TO_UPDATE[0]): Promise<UpdateStats> {
  const stats: UpdateStats = {
    table: config.table,
    column: config.column,
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  }

  console.log(`\n📋 Processing ${config.table}.${config.column}`)

  // Fetch all rows with non-null URLs
  const { data: rows, error } = await supabase
    .from(config.table)
    .select(`id, ${config.column}`)
    .not(config.column, 'is', null)

  if (error) {
    console.error(`  ❌ Error fetching ${config.table}: ${error.message}`)
    return stats
  }

  if (!rows || rows.length === 0) {
    console.log(`  ℹ️  No rows with URLs found`)
    return stats
  }

  stats.total = rows.length
  console.log(`  Found ${stats.total} rows with URLs`)

  const toWasabi = !REVERT
  const direction = toWasabi ? 'Supabase → Wasabi' : 'Wasabi → Supabase'
  console.log(`  Direction: ${direction}`)

  for (const row of rows) {
    const currentUrl = row[config.column] as string
    const newUrl = transformUrl(currentUrl, config.bucket, toWasabi)

    if (!newUrl) {
      // URL doesn't match pattern, skip
      stats.skipped++
      continue
    }

    if (currentUrl === newUrl) {
      stats.skipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`  🔍 Would update ID ${row.id}:`)
      console.log(`      From: ${currentUrl}`)
      console.log(`      To:   ${newUrl}`)
      stats.updated++
      continue
    }

    // Update the row
    const { error: updateError } = await supabase
      .from(config.table)
      .update({ [config.column]: newUrl })
      .eq('id', row.id)

    if (updateError) {
      console.error(`  ❌ Failed to update ID ${row.id}: ${updateError.message}`)
      stats.failed++
    } else {
      stats.updated++
    }
  }

  console.log(`  ✅ Updated: ${stats.updated} | Skipped: ${stats.skipped} | Failed: ${stats.failed}`)
  return stats
}

async function main() {
  console.log('🔄 URL Update Script')
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ LIVE'}`)
  console.log(`   Direction: ${REVERT ? 'Wasabi → Supabase (REVERT)' : 'Supabase → Wasabi'}`)
  console.log(`   Wasabi base: ${WASABI_BASE}`)

  // Verify environment
  const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = requiredVars.filter(v => !process.env[v])
  if (missing.length > 0) {
    console.error(`\n❌ Missing environment variables: ${missing.join(', ')}`)
    process.exit(1)
  }

  const allStats: UpdateStats[] = []

  for (const config of TABLES_TO_UPDATE) {
    allStats.push(await updateTable(config))
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Update Summary')
  console.log('='.repeat(50))

  let totalRows = 0, totalUpdated = 0, totalSkipped = 0, totalFailed = 0

  for (const stats of allStats) {
    totalRows += stats.total
    totalUpdated += stats.updated
    totalSkipped += stats.skipped
    totalFailed += stats.failed
  }

  console.log(`\nTOTAL: ${totalRows} rows | ${totalUpdated} updated | ${totalSkipped} skipped | ${totalFailed} failed`)

  if (totalFailed > 0) {
    console.log('\n⚠️  Some updates failed. Review errors above.')
    process.exit(1)
  }

  if (DRY_RUN) {
    console.log('\n🔍 Dry run complete. Run without --dry-run to apply changes.')
  } else {
    console.log('\n✅ URL updates completed successfully!')
  }
}

main().catch(console.error)
