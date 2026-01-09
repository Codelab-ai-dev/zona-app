#!/usr/bin/env npx tsx
/**
 * Update database URLs to Bunny CDN
 */

import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL || 'https://zonagol.b-cdn.net'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const TABLES_TO_UPDATE = [
  { table: 'leagues', column: 'logo', folder: 'league-logos' },
  { table: 'teams', column: 'logo', folder: 'team-logos' },
  { table: 'players', column: 'photo', folder: 'player-photos' },
  { table: 'players', column: 'id_document_url', folder: 'player-photos' },
  { table: 'coaching_staff', column: 'photo', folder: 'player-photos' },
]

function transformUrl(url: string, folder: string): string | null {
  if (!url) return null

  // Extract filename from Supabase URL
  // From: https://xxx/storage/v1/object/public/bucket/filename.jpg
  const supabasePattern = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/
  const match = url.match(supabasePattern)

  if (match) {
    const fileName = match[1]
    return `${BUNNY_CDN_URL}/${folder}/${fileName}`
  }

  return null
}

async function updateTable(config: typeof TABLES_TO_UPDATE[0]) {
  console.log(`\n📋 Processing ${config.table}.${config.column}`)

  const { data: rows, error } = await supabase
    .from(config.table)
    .select(`id, ${config.column}`)
    .not(config.column, 'is', null)

  if (error || !rows) {
    console.error(`  ❌ Error: ${error?.message}`)
    return { updated: 0, skipped: 0, failed: 0 }
  }

  console.log(`  Found ${rows.length} rows with URLs`)

  let updated = 0, skipped = 0, failed = 0

  for (const row of rows) {
    const currentUrl = row[config.column] as string
    const newUrl = transformUrl(currentUrl, config.folder)

    if (!newUrl) {
      skipped++
      continue
    }

    if (currentUrl === newUrl) {
      skipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`  🔍 Would update ID ${row.id}:`)
      console.log(`      → ${newUrl}`)
      updated++
      continue
    }

    const { error: updateError } = await supabase
      .from(config.table)
      .update({ [config.column]: newUrl })
      .eq('id', row.id)

    if (updateError) {
      console.error(`  ❌ Failed ID ${row.id}: ${updateError.message}`)
      failed++
    } else {
      updated++
    }
  }

  console.log(`  ✅ Updated: ${updated} | Skipped: ${skipped} | Failed: ${failed}`)
  return { updated, skipped, failed }
}

async function main() {
  console.log('🔄 URL Update Script → Bunny CDN')
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ LIVE'}`)
  console.log(`   CDN URL: ${BUNNY_CDN_URL}`)

  let totalUpdated = 0, totalSkipped = 0, totalFailed = 0

  for (const config of TABLES_TO_UPDATE) {
    const { updated, skipped, failed } = await updateTable(config)
    totalUpdated += updated
    totalSkipped += skipped
    totalFailed += failed
  }

  console.log('\n' + '='.repeat(50))
  console.log(`TOTAL: ${totalUpdated} updated | ${totalSkipped} skipped | ${totalFailed} failed`)

  if (DRY_RUN) {
    console.log('\n🔍 Dry run complete. Run without --dry-run to apply.')
  } else {
    console.log('\n✅ URLs updated to Bunny CDN!')
  }
}

main().catch(console.error)
