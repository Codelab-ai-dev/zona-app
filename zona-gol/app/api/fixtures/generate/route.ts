import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

interface FixtureResult {
  success: boolean
  data?: {
    rounds: Array<{
      round: number
      matches: Array<{
        homeTeamId: string
        awayTeamId: string
      }>
      byeTeamId?: string
    }>
  }
  error?: string
}

async function runPythonSolver(input: object): Promise<FixtureResult> {
  return new Promise((resolve) => {
    const projectRoot = process.cwd()
    const pythonPath = path.join(projectRoot, '.venv', 'bin', 'python')
    const scriptPath = path.join(projectRoot, 'scripts', 'generate_fixtures.py')

    const python = spawn(pythonPath, [scriptPath])

    let stdout = ''
    let stderr = ''

    python.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    python.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    python.on('close', (code) => {
      if (stderr) {
        console.log('Python stderr:', stderr)
      }

      if (code !== 0) {
        resolve({
          success: false,
          error: `Python process exited with code ${code}: ${stderr}`
        })
        return
      }

      try {
        const result = JSON.parse(stdout)
        resolve(result)
      } catch {
        resolve({
          success: false,
          error: `Failed to parse Python output: ${stdout}`
        })
      }
    })

    python.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to start Python: ${err.message}. Make sure .venv is set up with OR-Tools installed.`
      })
    })

    // Send input to Python script
    python.stdin.write(JSON.stringify(input))
    python.stdin.end()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { teams, existingMatches, isDoubleRound } = body

    if (!teams || !Array.isArray(teams) || teams.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Se requieren al menos 2 equipos' },
        { status: 400 }
      )
    }

    console.log('📥 API /fixtures/generate llamada (CP-SAT Solver)')
    console.log(`   - Equipos: ${teams.length}`)
    console.log(`   - Partidos existentes: ${existingMatches?.length || 0}`)
    console.log(`   - Doble vuelta: ${isDoubleRound || false}`)

    const result = await runPythonSolver({
      teams,
      existingMatches: existingMatches || [],
      isDoubleRound: isDoubleRound || false
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    console.error('Error en /api/fixtures/generate:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}
