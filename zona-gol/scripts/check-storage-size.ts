#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const buckets = ['player-photos', 'team-logos', 'league-logos', 'app-releases']

async function getSize() {
  let total = 0

  for (const bucket of buckets) {
    const { data } = await supabase.storage.from(bucket).list('', { limit: 1000 })
    if (!data) continue

    const files = data.filter(f => f.metadata !== null)
    const size = files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0)
    total += size

    console.log(`${bucket}: ${files.length} archivos - ${(size / 1024 / 1024).toFixed(2)} MB`)
  }

  console.log('\n─────────────────────────────────')
  console.log(`TOTAL: ${(total / 1024 / 1024).toFixed(2)} MB (${(total / 1024 / 1024 / 1024).toFixed(3)} GB)`)
}

getSize()
