/**
 * Script para comparar embeddings generados por Flutter y Web
 * 
 * Este script permite cargar y comparar embeddings generados por ambas plataformas
 * para verificar su compatibilidad y similitud.
 */

const fs = require('fs');
const path = require('path');

// Función para calcular similitud coseno entre dos embeddings
function cosineSimilarity(embedding1, embedding2) {
  if (embedding1.length !== embedding2.length) {
    throw new Error(`Dimensiones incompatibles: ${embedding1.length} vs ${embedding2.length}`);
  }
  
  const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
  const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Función para cargar embeddings desde archivos JSON
 */
function loadEmbeddings(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error al cargar embeddings desde ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Función principal para comparar embeddings
 */
function compareEmbeddings(flutterEmbeddingsPath, webEmbeddingsPath) {
  console.log('Comparando embeddings de Flutter y Web...\n');
  
  // Cargar embeddings
  const flutterEmbeddings = loadEmbeddings(flutterEmbeddingsPath);
  const webEmbeddings = loadEmbeddings(webEmbeddingsPath);
  
  if (!flutterEmbeddings || !webEmbeddings) {
    console.error('No se pudieron cargar los embeddings. Verifica las rutas de los archivos.');
    return;
  }
  
  // Verificar formato
  if (!Array.isArray(flutterEmbeddings) || !Array.isArray(webEmbeddings)) {
    console.error('Formato de embeddings inválido. Se esperaba un array.');
    return;
  }
  
  console.log(`Embeddings de Flutter cargados: ${flutterEmbeddings.length}`);
  console.log(`Embeddings de Web cargados: ${webEmbeddings.length}`);
  
  // Verificar dimensiones
  if (flutterEmbeddings.length > 0) {
    console.log(`Dimensiones Flutter: ${flutterEmbeddings[0].length}`);
  }
  if (webEmbeddings.length > 0) {
    console.log(`Dimensiones Web: ${webEmbeddings[0].length}`);
  }
  
  // Comparar embeddings del mismo índice (asumiendo que corresponden a la misma cara)
  const minLength = Math.min(flutterEmbeddings.length, webEmbeddings.length);
  const similarities = [];
  
  console.log('\nComparando embeddings correspondientes:');
  for (let i = 0; i < minLength; i++) {
    const flutterEmb = flutterEmbeddings[i];
    const webEmb = webEmbeddings[i];
    
    if (flutterEmb.length !== webEmb.length) {
      console.warn(`⚠️ Advertencia: Dimensiones diferentes para embedding #${i+1}: Flutter=${flutterEmb.length}, Web=${webEmb.length}`);
      continue;
    }
    
    const similarity = cosineSimilarity(flutterEmb, webEmb);
    similarities.push(similarity);
    console.log(`Embedding #${i+1}: Similitud = ${similarity.toFixed(4)}`);
  }
  
  // Calcular estadísticas
  if (similarities.length > 0) {
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const minSimilarity = Math.min(...similarities);
    const maxSimilarity = Math.max(...similarities);
    
    console.log('\nEstadísticas de similitud:');
    console.log(`Promedio: ${avgSimilarity.toFixed(4)}`);
    console.log(`Mínimo: ${minSimilarity.toFixed(4)}`);
    console.log(`Máximo: ${maxSimilarity.toFixed(4)}`);
    
    // Evaluar compatibilidad
    const compatibilityThreshold = 0.7;
    console.log(`\nUmbral de compatibilidad: ${compatibilityThreshold}`);
    console.log(`Sistemas compatibles: ${avgSimilarity >= compatibilityThreshold ? 'SÍ ✅' : 'NO ❌'}`);
    
    if (avgSimilarity < compatibilityThreshold) {
      console.log('\n⚠️ ADVERTENCIA: Los sistemas generan embeddings incompatibles');
      console.log('Recomendaciones:');
      console.log('1. Verificar que ambos sistemas usen el mismo modelo MobileFaceNet');
      console.log('2. Confirmar que el preprocesamiento de imágenes sea idéntico');
      console.log('3. Asegurar que la normalización L2 se aplique correctamente');
      console.log('4. Revisar la extracción de la región facial con padding');
    } else {
      console.log('\n✅ Los sistemas generan embeddings compatibles');
      console.log('Recomendaciones:');
      console.log('1. Realizar pruebas con datos reales para confirmar la compatibilidad');
      console.log('2. Ajustar el umbral de verificación según necesidades específicas');
      console.log('3. Implementar pruebas periódicas para mantener la compatibilidad');
    }
  }
}

// Verificar argumentos de línea de comandos
if (process.argv.length < 4) {
  console.log('Uso: node compare-embeddings.js <ruta-embeddings-flutter> <ruta-embeddings-web>');
  console.log('Ejemplo: node compare-embeddings.js ./flutter-embeddings.json ./web-embeddings.json');
} else {
  const flutterPath = process.argv[2];
  const webPath = process.argv[3];
  compareEmbeddings(flutterPath, webPath);
}
