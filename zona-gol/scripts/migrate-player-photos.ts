/**
 * Script para migrar fotos de jugadores de base64 a Supabase Storage
 * Ejecutar con: source .env.local && npx tsx scripts/migrate-player-photos.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function migratePhotos() {
  console.log('🚀 Iniciando migración de fotos de jugadores...\n')

  // 1. Obtener solo IDs (sin la columna photo pesada)
  const { data: playerIds, error: idsError } = await supabase
    .from('players')
    .select('id, name')
    .not('photo', 'is', null)

  if (idsError) {
    console.error('❌ Error obteniendo IDs:', idsError.message)
    return
  }

  console.log(`📊 Encontrados ${playerIds?.length || 0} jugadores con fotos\n`)

  if (!playerIds || playerIds.length === 0) {
    console.log('✅ No hay fotos para migrar')
    return
  }

  let migrated = 0
  let skipped = 0
  let errors = 0

  // 2. Procesar cada jugador individualmente
  for (const playerInfo of playerIds) {
    try {
      // Obtener foto de este jugador específico
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('id, name, photo')
        .eq('id', playerInfo.id)
        .single()

      if (fetchError || !player) {
        console.error(`❌ ${playerInfo.name}: Error obteniendo datos`)
        errors++
        continue
      }

      // Verificar si ya es una URL (ya migrado)
      if (!player.photo || player.photo.startsWith('http')) {
        console.log(`⏭️  ${player.name}: Ya es URL o vacío`)
        skipped++
        continue
      }

      // Verificar si es base64
      if (!player.photo.startsWith('data:image')) {
        console.log(`⏭️  ${player.name}: No es base64 válido`)
        skipped++
        continue
      }

      // Extraer tipo de imagen y datos
      const matches = player.photo.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!matches) {
        console.log(`⚠️  ${player.name}: Formato no reconocido`)
        skipped++
        continue
      }

      const [, imageType, base64Data] = matches
      const buffer = Buffer.from(base64Data, 'base64')
      const fileName = `${player.id}.${imageType}`

      console.log(`📤 ${player.name}: Subiendo ${(buffer.length / 1024).toFixed(0)}KB...`)

      // Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(fileName, buffer, {
          contentType: `image/${imageType}`,
          upsert: true
        })

      if (uploadError) {
        console.error(`❌ ${player.name}: ${uploadError.message}`)
        errors++
        continue
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('player-photos')
        .getPublicUrl(fileName)

      // Actualizar registro con la URL
      const { error: updateError } = await supabase
        .from('players')
        .update({ photo: publicUrl })
        .eq('id', player.id)

      if (updateError) {
        console.error(`❌ ${player.name}: ${updateError.message}`)
        errors++
        continue
      }

      console.log(`✅ ${player.name}: Migrado`)
      migrated++

    } catch (err) {
      console.error(`❌ ${playerInfo.name}: Error -`, err)
      errors++
    }
  }

  console.log('\n📊 Resumen:')
  console.log(`   ✅ Migrados: ${migrated}`)
  console.log(`   ⏭️  Saltados: ${skipped}`)
  console.log(`   ❌ Errores: ${errors}`)
}

migratePhotos()
  .then(() => {
    console.log('\n🏁 Migración completada')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n💥 Error fatal:', err)
    process.exit(1)
  })
