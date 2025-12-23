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
