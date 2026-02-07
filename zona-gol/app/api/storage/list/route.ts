import { NextRequest, NextResponse } from 'next/server'
import { storageService } from '@/lib/storage/storage-service'
import type { BucketName } from '@/lib/storage/types'
import { verifyStorageAuth } from '../auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyStorageAuth()
    if (!auth) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket') as BucketName | null
    const prefix = searchParams.get('prefix') || undefined

    if (!bucket) {
      return NextResponse.json(
        { error: 'bucket es requerido' },
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

    console.log(`[API List] Listing ${bucket}/${prefix || ''}`)

    const files = await storageService.list(bucket, prefix)

    // Sort by creation date descending
    files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      files,
    })

  } catch (error: any) {
    console.error('[API List] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al listar archivos' },
      { status: 500 }
    )
  }
}
