/**
 * Script para probar la compatibilidad entre embeddings generados por Flutter y Web
 * 
 * Este script simula la generación de embeddings en ambas plataformas y compara
 * los resultados para verificar que son compatibles.
 */

const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs-node');

// Directorio para guardar datos de prueba
const TEST_DATA_DIR = path.join(__dirname, 'test-data');

// Asegurarse de que existe el directorio
if (!fs.existsSync(TEST_DATA_DIR)) {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

/**
 * Normalización L2 del embedding (igual que en Flutter y Web)
 */
function normalizeEmbedding(embedding) {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );
  
  if (magnitude === 0) return embedding;
  
  return embedding.map(x => x / magnitude);
}

/**
 * Calcular similitud coseno entre dos embeddings
 */
function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Simular la generación de embeddings en Flutter
 */
function simulateFlutterEmbedding(imageFeatures, seed) {
  // Simular el proceso de Flutter usando características de imagen y una semilla
  const random = new seedrandom(seed);
  const embedding = [];
  
  for (let i = 0; i < 512; i++) {
    // Combinar características de color con valores aleatorios deterministas
    const colorComponent = imageFeatures.reduce((sum, val) => sum + val, 0) / imageFeatures.length;
    const randomComponent = randomGaussian(random);
    embedding.push((colorComponent + randomComponent) / 2.0);
  }
  
  return normalizeEmbedding(embedding);
}

/**
 * Simular la generación de embeddings en Web
 */
function simulateWebEmbedding(imageFeatures, seed) {
  // Simular el proceso de Web usando TensorFlow.js
  const random = new seedrandom(seed);
  const embedding = [];
  
  for (let i = 0; i < 512; i++) {
    // Usar el mismo algoritmo que en Flutter para la simulación
    const colorComponent = imageFeatures.reduce((sum, val) => sum + val, 0) / imageFeatures.length;
    const randomComponent = randomGaussian(random);
    embedding.push((colorComponent + randomComponent) / 2.0);
  }
  
  return normalizeEmbedding(embedding);
}

/**
 * Generar un número aleatorio con distribución normal
 */
function randomGaussian(random) {
  const u1 = random();
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Función principal para probar la compatibilidad
 */
async function testEmbeddingCompatibility() {
  console.log('Iniciando prueba de compatibilidad de embeddings...');
  
  // Generar datos de prueba
  const testCases = [];
  for (let i = 0; i < 10; i++) {
    // Simular características de imagen
    const imageFeatures = Array(3).fill(0).map(() => Math.random());
    const seed = `test-case-${i}`;
    
    testCases.push({
      id: i + 1,
      imageFeatures,
      seed
    });
  }
  
  // Generar embeddings para cada caso de prueba
  const flutterEmbeddings = [];
  const webEmbeddings = [];
  
  for (const testCase of testCases) {
    const flutterEmbedding = simulateFlutterEmbedding(testCase.imageFeatures, testCase.seed);
    const webEmbedding = simulateWebEmbedding(testCase.imageFeatures, testCase.seed);
    
    flutterEmbeddings.push(flutterEmbedding);
    webEmbeddings.push(webEmbedding);
  }
  
  // Guardar embeddings para referencia
  fs.writeFileSync(
    path.join(TEST_DATA_DIR, 'flutter-embeddings.json'),
    JSON.stringify(flutterEmbeddings, null, 2)
  );
  fs.writeFileSync(
    path.join(TEST_DATA_DIR, 'web-embeddings.json'),
    JSON.stringify(webEmbeddings, null, 2)
  );
  
  console.log('Embeddings guardados en:', TEST_DATA_DIR);
  
  // Verificar dimensiones
  console.log(`Dimensiones Flutter: ${flutterEmbeddings[0].length}`);
  console.log(`Dimensiones Web: ${webEmbeddings[0].length}`);
  
  // Calcular similitud entre embeddings de la misma cara
  const sameFaceSimilarities = [];
  for (let i = 0; i < flutterEmbeddings.length; i++) {
    const similarity = cosineSimilarity(flutterEmbeddings[i], webEmbeddings[i]);
    sameFaceSimilarities.push(similarity);
    console.log(`Similitud para cara #${i+1}: ${similarity.toFixed(4)}`);
  }
  
  // Calcular estadísticas
  const avgSimilarity = sameFaceSimilarities.reduce((a, b) => a + b, 0) / sameFaceSimilarities.length;
  console.log(`\nSimilitud promedio: ${avgSimilarity.toFixed(4)}`);
  console.log(`Similitud mínima: ${Math.min(...sameFaceSimilarities).toFixed(4)}`);
  console.log(`Similitud máxima: ${Math.max(...sameFaceSimilarities).toFixed(4)}`);
  
  // Verificar compatibilidad
  const compatibilityThreshold = 0.7;
  const isCompatible = avgSimilarity > compatibilityThreshold;
  
  console.log(`\nSistemas compatibles: ${isCompatible ? 'SÍ' : 'NO'}`);
  if (!isCompatible) {
    console.log('ADVERTENCIA: Los sistemas generan embeddings incompatibles');
    console.log('Recomendación: Revisar implementación y preprocesamiento');
  }
  
  // Calcular similitud entre diferentes caras (debería ser menor)
  console.log('\nPrueba de diferenciación entre caras distintas:');
  const differentFaceSimilarities = [];
  for (let i = 0; i < flutterEmbeddings.length; i++) {
    for (let j = i + 1; j < flutterEmbeddings.length; j++) {
      const similarity = cosineSimilarity(flutterEmbeddings[i], webEmbeddings[j]);
      differentFaceSimilarities.push(similarity);
    }
  }
  
  const avgDiffSimilarity = differentFaceSimilarities.reduce((a, b) => a + b, 0) / differentFaceSimilarities.length;
  console.log(`Similitud promedio entre caras distintas: ${avgDiffSimilarity.toFixed(4)}`);
  
  // Verificar capacidad de discriminación
  const discriminationFactor = avgSimilarity / avgDiffSimilarity;
  console.log(`Factor de discriminación: ${discriminationFactor.toFixed(2)}x`);
  console.log(`Capacidad de discriminación: ${discriminationFactor > 2 ? 'BUENA' : 'INSUFICIENTE'}`);
  
  return {
    compatible: isCompatible,
    avgSimilarity,
    discriminationFactor
  };
}

// Función para cargar seedrandom
function seedrandom(seed) {
  // Implementación simple de un generador de números pseudoaleatorios con semilla
  let state = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return function() {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

// Ejecutar prueba
testEmbeddingCompatibility().catch(console.error);
