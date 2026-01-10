import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { storageService } from '@/lib/storage/storage-service'
import type { BucketName } from '@/lib/storage/types'

export async function DELETE(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket') as BucketName | null
    const path = searchParams.get('path')

    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'bucket y path son requeridos' },
        { status: 400 }
      )
    }

    // Validate bucket
    const validBuckets: BucketName[] = ['player-photos', 'team-logos', 'league-logos', 'app-releases']
    if (!validBuckets.includes(bucket)) {
      return NextResponse.json(
        { error: `Bucket inválido: ${bucket}` },
        { status: 400 }
      )
    }

    console.log(`[API Delete] Deleting ${bucket}/${path}`)

    await storageService.delete(bucket, path)

    return NextResponse.json({
      success: true,
    })

  } catch (error: any) {
    console.error('[API Delete] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar archivo' },
      { status: 500 }
    )
  }
}
