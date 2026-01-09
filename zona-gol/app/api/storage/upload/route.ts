import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { storageService } from '@/lib/storage/storage-service'
import type { BucketName } from '@/lib/storage/types'

// Bucket configurations
const BUCKET_CONFIG: Record<string, { maxSize: number; allowedTypes: string[]; requiresLeagueId?: boolean }> = {
  'player-photos': { maxSize: 5 * 1024 * 1024, allowedTypes: ['image/'] },
  'team-logos': { maxSize: 5 * 1024 * 1024, allowedTypes: ['image/'] },
  'league-logos': { maxSize: 5 * 1024 * 1024, allowedTypes: ['image/'] },
  'app-releases': { maxSize: 150 * 1024 * 1024, allowedTypes: ['application/vnd.android.package-archive', 'application/octet-stream'], requiresLeagueId: true },
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = formData.get('bucket') as BucketName | null
    const fileId = formData.get('fileId') as string | null
    const leagueId = formData.get('leagueId') as string | null

    if (!file || !bucket || !fileId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: file, bucket, fileId' },
        { status: 400 }
      )
    }

    // Validate bucket
    const bucketConfig = BUCKET_CONFIG[bucket]
    if (!bucketConfig) {
      return NextResponse.json(
        { error: `Bucket inválido: ${bucket}` },
        { status: 400 }
      )
    }

    // Check if leagueId is required
    if (bucketConfig.requiresLeagueId && !leagueId) {
      return NextResponse.json(
        { error: 'leagueId es requerido para este bucket' },
        { status: 400 }
      )
    }

    // Validate file type
    const isValidType = bucketConfig.allowedTypes.some(type => file.type.startsWith(type))
    if (!isValidType) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${file.type}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > bucketConfig.maxSize) {
      const maxMB = Math.round(bucketConfig.maxSize / (1024 * 1024))
      return NextResponse.json(
        { error: `El archivo debe ser menor a ${maxMB}MB` },
        { status: 400 }
      )
    }

    // Get file extension and build path
    const ext = file.name.split('.').pop()?.toLowerCase() || (bucket === 'app-releases' ? 'apk' : 'jpg')
    let path: string

    if (bucket === 'app-releases' && leagueId) {
      // For APKs, use leagueId as folder
      path = `${leagueId}/${fileId}.${ext}`
    } else {
      path = `${fileId}.${ext}`
    }

    console.log(`[API Upload] Uploading ${bucket}/${path} (${file.size} bytes)`)

    // Upload using storage service (will use correct provider based on env)
    const result = await storageService.upload(file, bucket as BucketName, path, {
      contentType: file.type,
      upsert: true,
    })

    console.log(`[API Upload] Success: ${result.publicUrl}`)

    return NextResponse.json({
      success: true,
      publicUrl: result.publicUrl,
      path: result.path,
    })

  } catch (error: any) {
    console.error('[API Upload] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al subir archivo' },
      { status: 500 }
    )
  }
}
