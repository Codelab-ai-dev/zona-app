/**
 * Bridge de archivos para comunicación Web Dashboard <-> Flutter
 * Usa archivos compartidos para intercambiar imágenes y embeddings
 * Evita problemas de networking HTTP en Android
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Función loadModels para compatibilidad con la interfaz existente
 */
export async function loadModels(): Promise<void> {
  try {
    console.log('🔵 Inicializando bridge de archivos con Flutter...')
    await initFileBridge()
    console.log('✅ Bridge de archivos inicializado')
  } catch (error) {
    console.error('❌ Error inicializando bridge de archivos:', error)
    throw new Error('No se pudo inicializar comunicación con Flutter')
  }
}

// Configuración - directorio compartido (usar directorio temporal del sistema)
const BRIDGE_DIR = path.join(os.tmpdir(), 'flutter-web-bridge')
const MAX_WAIT_TIME = 30000 // 30 segundos máximo de espera

/**
 * Inicializa el directorio de bridge
 */
export async function initFileBridge(): Promise<void> {
  // Verificar si estamos en el servidor o cliente
  if (typeof window !== 'undefined') {
    throw new Error('Bridge de archivos solo funciona en el servidor (Node.js), no en el navegador')
  }
  
  try {
    console.log('🔵 Intentando inicializar bridge en:', BRIDGE_DIR)
    
    if (!fs.existsSync(BRIDGE_DIR)) {
      console.log('📁 Directorio no existe, creando...')
      fs.mkdirSync(BRIDGE_DIR, { recursive: true })
      console.log('✅ Directorio creado exitosamente')
    } else {
      console.log('📁 Directorio ya existe')
    }
    
    // Verificar permisos de escritura
    const testFile = path.join(BRIDGE_DIR, 'test_write.txt')
    fs.writeFileSync(testFile, 'test')
    fs.unlinkSync(testFile)
    console.log('✅ Permisos de escritura verificados')
    
    console.log('✅ Bridge de archivos inicializado en:', BRIDGE_DIR)
  } catch (error) {
    console.error('❌ Error inicializando bridge de archivos:', error)
    console.error('❌ BRIDGE_DIR value:', BRIDGE_DIR)
    console.error('❌ Error details:', error)
    throw error
  }
}

/**
 * Genera embedding usando Flutter a través de archivos
 */
export async function generateEmbeddingViaFile(imageDataUrl: string): Promise<{
  embedding: number[]
  qualityScore: number
  confidence: number
  error?: string
}> {
  try {
    console.log('🔵 Generando embedding via bridge de archivos...')
    
    // Crear ID único para esta request
    const requestId = `embed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Preparar paths
    const imageFile = path.join(BRIDGE_DIR, `${requestId}_image.txt`)
    const requestFile = path.join(BRIDGE_DIR, `${requestId}_request.json`)
    const responseFile = path.join(BRIDGE_DIR, `${requestId}_response.json`)
    
    // 1. Guardar imagen en archivo
    fs.writeFileSync(imageFile, imageDataUrl)
    
    // 2. Crear archivo de request para Flutter
    const request = {
      requestId,
      imageFile,
      timestamp: Date.now(),
      action: 'generate_embedding'
    }
    fs.writeFileSync(requestFile, JSON.stringify(request, null, 2))
    
    console.log('📁 Archivos creados, esperando respuesta de Flutter...')
    
    // 3. Esperar respuesta de Flutter
    const response = await waitForFlutterResponse(responseFile)
    
    // 4. Limpiar archivos temporales
    try {
      if (fs.existsSync(imageFile)) fs.unlinkSync(imageFile)
      if (fs.existsSync(requestFile)) fs.unlinkSync(requestFile)
      if (fs.existsSync(responseFile)) fs.unlinkSync(responseFile)
    } catch (cleanupError) {
      console.warn('⚠️ Error limpiando archivos temporales:', cleanupError)
    }
    
    // 5. Procesar respuesta
    if (response.error) {
      throw new Error(response.error)
    }
    
    console.log('✅ Embedding generado via bridge de archivos!')
    console.log('📏 Dimensiones:', response.embedding?.length || 0)
    console.log('📊 Quality score:', (response.qualityScore * 100).toFixed(1) + '%')
    
    return {
      embedding: response.embedding || [],
      qualityScore: response.qualityScore || 0,
      confidence: response.qualityScore || 0
    }
    
  } catch (error: any) {
    console.error('❌ Error en bridge de archivos:', error)
    return {
      embedding: [],
      qualityScore: 0,
      confidence: 0,
      error: error.message || 'Error en comunicación con Flutter'
    }
  }
}

/**
 * Espera la respuesta de Flutter monitoreando el archivo
 */
async function waitForFlutterResponse(responseFile: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const checkForResponse = () => {
      // Verificar timeout
      if (Date.now() - startTime > MAX_WAIT_TIME) {
        reject(new Error('Timeout esperando respuesta de Flutter'))
        return
      }
      
      // Verificar si existe el archivo de respuesta
      if (fs.existsSync(responseFile)) {
        try {
          const responseData = fs.readFileSync(responseFile, 'utf-8')
          const response = JSON.parse(responseData)
          resolve(response)
        } catch (error) {
          console.log('📄 Archivo de respuesta encontrado pero no legible, reintentando...')
          setTimeout(checkForResponse, 500)
        }
      } else {
        // Reintentar después de un delay
        setTimeout(checkForResponse, 500)
      }
    }
    
    checkForResponse()
  })
}

/**
 * Función principal para compatibilidad con la interfaz actual
 */
export async function generateFaceEmbedding(imageDataUrl: string): Promise<{
  embedding: number[]
  qualityScore: number
  confidence: number
  error?: string
}> {
  // Inicializar bridge si es necesario
  try {
    await initFileBridge()
  } catch (initError) {
    return {
      embedding: [],
      qualityScore: 0,
      confidence: 0,
      error: 'No se pudo inicializar bridge de archivos'
    }
  }
  
  // Generar embedding via archivos
  return await generateEmbeddingViaFile(imageDataUrl)
}