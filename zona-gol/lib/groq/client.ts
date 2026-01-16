import Groq from 'groq-sdk'

// Lazy initialization to avoid build-time errors when env vars are not available
let groqClient: Groq | null = null

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY no está configurada. Configura la variable de entorno para usar la extracción de INE.')
    }
    groqClient = new Groq({ apiKey })
  }
  return groqClient
}

export interface INEExtractionResult {
  success: boolean
  data?: {
    nombre_completo: string
    fecha_nacimiento: string // Format: YYYY-MM-DD
    curp: string
    clave_elector?: string
  }
  error?: string
}

const INE_EXTRACTION_PROMPT = `Analiza esta imagen de una credencial INE/IFE mexicana y extrae la siguiente información en formato JSON.

IMPORTANTE:
- La fecha de nacimiento debe estar en formato YYYY-MM-DD
- El CURP tiene 18 caracteres
- Si no puedes leer algún campo con certeza, déjalo vacío

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "nombre_completo": "NOMBRE(S) APELLIDO_PATERNO APELLIDO_MATERNO",
  "fecha_nacimiento": "YYYY-MM-DD",
  "curp": "CURP18CARACTERES",
  "clave_elector": "CLAVEELECTOR"
}

Si la imagen no es una INE válida o no puedes extraer los datos, responde:
{
  "error": "descripción del problema"
}`

// Fixture Generation using Circle Method (Round-Robin Algorithm)
export interface FixtureGenerationResult {
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

interface TeamInfo {
  id: string
  name: string
}

interface ExistingMatch {
  homeTeamId: string
  awayTeamId: string
  round: number
}

/**
 * Circle Method Algorithm for Round-Robin Tournament
 * This is a proven algorithm that guarantees:
 * - Each team plays exactly once against every other team
 * - Each team plays at most once per round
 * - Optimal distribution of matches
 */
export async function generateFixturesWithAI(
  teams: TeamInfo[],
  existingMatches: ExistingMatch[] = [],
  isDoubleRound: boolean = false
): Promise<FixtureGenerationResult> {
  try {
    console.log('🔄 generateFixtures: Usando algoritmo Circle Method...')
    console.log(`   - Equipos: ${teams.length}`)
    console.log(`   - Partidos existentes: ${existingMatches.length}`)
    console.log(`   - Doble vuelta: ${isDoubleRound}`)

    if (teams.length < 2) {
      return {
        success: false,
        error: 'Se necesitan al menos 2 equipos',
      }
    }

    // Create set of existing pairs to skip
    const existingPairs = new Set<string>()
    existingMatches.forEach(m => {
      if (!isDoubleRound) {
        // For solo ida, A vs B = B vs A
        const pair = [m.homeTeamId, m.awayTeamId].sort().join('|')
        existingPairs.add(pair)
      } else {
        existingPairs.add(`${m.homeTeamId}|${m.awayTeamId}`)
      }
    })

    // Get the last round number
    const lastRound = existingMatches.length > 0 ? Math.max(...existingMatches.map(m => m.round)) : 0

    // Circle method setup
    const teamIds = teams.map(t => t.id)
    const n = teamIds.length
    const hasOddTeams = n % 2 !== 0

    // If odd number of teams, add a "BYE" placeholder
    const circleTeams = hasOddTeams ? [...teamIds, 'BYE'] : [...teamIds]
    const numTeams = circleTeams.length
    const totalRoundsFirstLeg = numTeams - 1
    const totalRounds = isDoubleRound ? totalRoundsFirstLeg * 2 : totalRoundsFirstLeg
    const matchesPerRound = Math.floor(numTeams / 2)

    console.log(`   - Total jornadas: ${totalRounds}`)
    console.log(`   - Partidos por jornada: ${matchesPerRound}`)
    console.log(`   - Última jornada existente: ${lastRound}`)

    const rounds: Array<{
      round: number
      matches: Array<{ homeTeamId: string; awayTeamId: string }>
      byeTeamId?: string
    }> = []

    // Generate all rounds using circle method
    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
      // Skip rounds that already have matches
      if (roundNum <= lastRound) {
        continue
      }

      const isSecondLeg = roundNum > totalRoundsFirstLeg
      const effectiveRound = isSecondLeg ? roundNum - totalRoundsFirstLeg : roundNum

      // Circle method: fix first team, rotate others
      const rotation = effectiveRound - 1
      const rotatedTeams = [circleTeams[0]]

      // Rotate the remaining teams
      for (let i = 1; i < numTeams; i++) {
        const newIndex = ((i - 1 + rotation) % (numTeams - 1)) + 1
        rotatedTeams.push(circleTeams[newIndex])
      }

      const roundMatches: Array<{ homeTeamId: string; awayTeamId: string }> = []
      let byeTeamId: string | undefined

      // Pair teams: first with last, second with second-to-last, etc.
      for (let i = 0; i < matchesPerRound; i++) {
        const team1 = rotatedTeams[i]
        const team2 = rotatedTeams[numTeams - 1 - i]

        // Skip if one team is BYE
        if (team1 === 'BYE') {
          byeTeamId = team2
          continue
        }
        if (team2 === 'BYE') {
          byeTeamId = team1
          continue
        }

        // Determine home/away (alternate for balance, swap for second leg)
        let homeTeam = i % 2 === 0 ? team1 : team2
        let awayTeam = i % 2 === 0 ? team2 : team1

        // In second leg, swap home/away
        if (isSecondLeg) {
          [homeTeam, awayTeam] = [awayTeam, homeTeam]
        }

        // Check if this match already exists
        const pairKey = !isDoubleRound
          ? [homeTeam, awayTeam].sort().join('|')
          : `${homeTeam}|${awayTeam}`

        if (existingPairs.has(pairKey)) {
          console.log(`   Saltando partido existente: ${homeTeam} vs ${awayTeam}`)
          continue
        }

        roundMatches.push({
          homeTeamId: homeTeam,
          awayTeamId: awayTeam,
        })

        // Mark as used to avoid duplicates
        existingPairs.add(pairKey)
      }

      // Only add round if it has matches
      if (roundMatches.length > 0) {
        rounds.push({
          round: roundNum,
          matches: roundMatches,
          byeTeamId,
        })
      }
    }

    const totalMatches = rounds.reduce((sum, r) => sum + r.matches.length, 0)
    console.log(`✅ Fixtures generados: ${rounds.length} jornadas, ${totalMatches} partidos`)

    return {
      success: true,
      data: {
        rounds,
      },
    }
  } catch (error) {
    console.error('Error generating fixtures:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al generar fixtures',
    }
  }
}

export async function extractINEData(imageBase64: string): Promise<INEExtractionResult> {
  try {
    console.log('🔵 extractINEData: Iniciando extracción...')

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    console.log('🔵 extractINEData: Base64 procesado, longitud:', base64Data.length)

    console.log('🔵 extractINEData: Llamando a Groq API...')
    const response = await getGroqClient().chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: INE_EXTRACTION_PROMPT,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1, // Low temperature for more consistent extraction
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return {
        success: false,
        error: 'No se recibió respuesta del modelo',
      }
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        success: false,
        error: 'No se pudo extraer información de la imagen',
      }
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Check if response contains an error
    if (parsed.error) {
      return {
        success: false,
        error: parsed.error,
      }
    }

    // Validate required fields
    if (!parsed.nombre_completo || !parsed.fecha_nacimiento || !parsed.curp) {
      return {
        success: false,
        error: 'No se pudieron extraer todos los campos requeridos',
      }
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(parsed.fecha_nacimiento)) {
      return {
        success: false,
        error: 'Formato de fecha inválido',
      }
    }

    // Validate CURP format (18 characters)
    if (parsed.curp.length !== 18) {
      return {
        success: false,
        error: 'Formato de CURP inválido',
      }
    }

    return {
      success: true,
      data: {
        nombre_completo: parsed.nombre_completo.trim(),
        fecha_nacimiento: parsed.fecha_nacimiento,
        curp: parsed.curp.toUpperCase(),
        clave_elector: parsed.clave_elector?.trim(),
      },
    }
  } catch (error) {
    console.error('Error extracting INE data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al procesar la imagen',
    }
  }
}
