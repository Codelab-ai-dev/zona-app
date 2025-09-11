import { NextResponse } from 'next/server'

/**
 * Health check endpoint para verificar que el servidor está funcionando
 */
export async function GET() {
  try {
    return NextResponse.json({ 
      status: 'healthy',
      service: 'zona-gol-api',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}