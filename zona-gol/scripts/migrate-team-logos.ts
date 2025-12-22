/**
 * Script para migrar logos de equipos de base64 a Supabase Storage
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

async function migrateLogos() {
  console.log('🚀 Iniciando migración de logos de equipos...\n')

  // 1. Obtener solo IDs (sin la columna logo pesada)
  const { data: teamIds, error: idsError } = await supabase
    .from('teams')
    .select('id, name')
    .not('logo', 'is', null)

  if (idsError) {
    console.error('❌ Error obteniendo IDs:', idsError.message)
    return
  }

  console.log(`📊 Encontrados ${teamIds?.length || 0} equipos con logos\n`)

  if (!teamIds || teamIds.length === 0) {
    console.log('✅ No hay logos para migrar')
    return
  }

  let migrated = 0
  let skipped = 0
  let errors = 0

  // 2. Procesar cada equipo individualmente
  for (const teamInfo of teamIds) {
    try {
      // Obtener logo de este equipo específico
      const { data: team, error: fetchError } = await supabase
        .from('teams')
        .select('id, name, logo')
        .eq('id', teamInfo.id)
        .single()

      if (fetchError || !team) {
        console.error(`❌ ${teamInfo.name}: Error obteniendo datos`)
        errors++
        continue
      }

      // Verificar si ya es una URL (ya migrado)
      if (!team.logo || team.logo.startsWith('http')) {
        console.log(`⏭️  ${team.name}: Ya es URL o vacío`)
        skipped++
        continue
      }

      // Verificar si es base64
      if (!team.logo.startsWith('data:image')) {
        console.log(`⏭️  ${team.name}: No es base64 válido`)
        skipped++
        continue
      }

      // Extraer tipo de imagen y datos
      const matches = team.logo.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!matches) {
        console.log(`⚠️  ${team.name}: Formato no reconocido`)
        skipped++
        continue
      }

      const [, imageType, base64Data] = matches
      const buffer = Buffer.from(base64Data, 'base64')
      const fileName = `${team.id}.${imageType}`

      console.log(`📤 ${team.name}: Subiendo ${(buffer.length / 1024).toFixed(0)}KB...`)

      // Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(fileName, buffer, {
          contentType: `image/${imageType}`,
          upsert: true
        })

      if (uploadError) {
        console.error(`❌ ${team.name}: ${uploadError.message}`)
        errors++
        continue
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('team-logos')
        .getPublicUrl(fileName)

      // Actualizar registro con la URL
      const { error: updateError } = await supabase
        .from('teams')
        .update({ logo: publicUrl })
        .eq('id', team.id)

      if (updateError) {
        console.error(`❌ ${team.name}: ${updateError.message}`)
        errors++
        continue
      }

      console.log(`✅ ${team.name}: Migrado`)
      migrated++

    } catch (err) {
      console.error(`❌ ${teamInfo.name}: Error -`, err)
      errors++
    }
  }

  console.log('\n📊 Resumen:')
  console.log(`   ✅ Migrados: ${migrated}`)
  console.log(`   ⏭️  Saltados: ${skipped}`)
  console.log(`   ❌ Errores: ${errors}`)
}

migrateLogos()
  .then(() => {
    console.log('\n🏁 Migración completada')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n💥 Error fatal:', err)
    process.exit(1)
  })
