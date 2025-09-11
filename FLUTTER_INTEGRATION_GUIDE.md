# Guía de Integración de Embeddings Faciales para Flutter

Esta guía explica cómo integrar la nueva implementación de embeddings faciales en la aplicación Flutter de Zona-Gol, asegurando la compatibilidad con la plataforma web.

## Requisitos Previos

- Flutter 3.0+ con soporte para TensorFlow Lite
- Modelo MobileFaceNet en formato TFLite
- Google ML Kit para detección facial
- Acceso a la API de Zona-Gol

## Configuración del Modelo

### 1. Ubicación del Modelo

El modelo MobileFaceNet debe estar ubicado en:

```
assets/models/mobilefacenet.tflite
```

### 2. Configuración de pubspec.yaml

Asegúrate de incluir el modelo en los assets:

```yaml
flutter:
  assets:
    - assets/models/mobilefacenet.tflite
```

### 3. Dependencias Requeridas

Añade las siguientes dependencias a tu `pubspec.yaml`:

```yaml
dependencies:
  google_ml_kit: ^0.13.0
  tflite_flutter: ^0.9.0
  image: ^4.0.15
  http: ^0.13.5
```

## Implementación

### 1. Servicio de Reconocimiento Facial

El servicio de reconocimiento facial debe seguir estos pasos para mantener la compatibilidad:

```dart
import 'dart:io';
import 'dart:math' as math;
import 'package:google_ml_kit/google_ml_kit.dart';
import 'package:tflite_flutter/tflite_flutter.dart';
import 'package:image/image.dart' as img;

class FaceRecognitionTFLiteService {
  late Interpreter _interpreter;
  
  Future<void> loadModel() async {
    // Cargar modelo MobileFaceNet
    _interpreter = await Interpreter.fromAsset('assets/models/mobilefacenet.tflite');
  }
  
  Future<List<double>?> extractFaceEmbedding(File imageFile, Face face) async {
    // 1. Cargar imagen
    final image = img.decodeImage(await imageFile.readAsBytes());
    if (image == null) return null;
    
    // 2. Extraer región facial con padding del 20%
    final faceImage = _extractFaceRegion(image, face);
    if (faceImage == null) return null;
    
    // 3. Redimensionar a 112x112 (requerido por MobileFaceNet)
    final resizedImage = img.copyResize(faceImage, width: 112, height: 112);
    
    // 4. Preprocesar imagen (normalizar a [-1, 1])
    final input = _preprocessImage(resizedImage);
    
    // 5. Ejecutar inferencia
    final output = List<List<double>>.filled(1, List<double>.filled(512, 0));
    _interpreter.run(input, output);
    
    // 6. Normalizar embedding (L2)
    final embedding = _normalizeEmbedding(output[0]);
    
    return embedding;
  }
  
  img.Image? _extractFaceRegion(img.Image image, Face face) {
    final bbox = face.boundingBox;
    
    // Añadir padding del 20%
    final padding = 0.2;
    final width = bbox.width;
    final height = bbox.height;
    final padX = (width * padding).round();
    final padY = (height * padding).round();
    
    final x = math.max(0, bbox.left.round() - padX);
    final y = math.max(0, bbox.top.round() - padY);
    final w = math.min(image.width - x, width.round() + 2 * padX);
    final h = math.min(image.height - y, height.round() + 2 * padY);
    
    if (w <= 0 || h <= 0) return null;
    
    return img.copyCrop(image, x: x, y: y, width: w, height: h);
  }
  
  List<List<List<List<double>>>> _preprocessImage(img.Image image) {
    final input = List.generate(
      1,
      (_) => List.generate(
        112,
        (_) => List.generate(
          112,
          (_) => List.filled(3, 0.0),
        ),
      ),
    );

    for (int y = 0; y < 112; y++) {
      for (int x = 0; x < 112; x++) {
        final pixel = image.getPixel(x, y);
        
        // Normalizar a [-1, 1] (típico para MobileFaceNet)
        input[0][y][x][0] = (pixel.r / 127.5) - 1.0; // R
        input[0][y][x][1] = (pixel.g / 127.5) - 1.0; // G
        input[0][y][x][2] = (pixel.b / 127.5) - 1.0; // B
      }
    }

    return input;
  }
  
  List<double> _normalizeEmbedding(List<double> embedding) {
    final magnitude = math.sqrt(
      embedding.map((x) => x * x).reduce((a, b) => a + b)
    );
    
    if (magnitude == 0) return embedding;
    
    return embedding.map((x) => x / magnitude).toList();
  }
}
```

### 2. Integración con la API de Zona-Gol

Para enviar los embeddings al backend:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class ZonaGolApiService {
  final String baseUrl;
  
  ZonaGolApiService({required this.baseUrl});
  
  Future<bool> syncPlayerEmbedding({
    required String playerId,
    required List<double> embedding,
    required double qualityScore,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/face-embedding'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'playerId': playerId,
          'embedding': embedding,
          'qualityScore': qualityScore,
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['success'] == true;
      }
      
      return false;
    } catch (e) {
      print('Error syncing embedding: $e');
      return false;
    }
  }
}
```

## Flujo de Trabajo para Registro de Jugadores

1. Capturar foto del jugador
2. Detectar cara usando Google ML Kit
3. Extraer embedding usando el servicio FaceRecognitionTFLiteService
4. Enviar embedding al backend usando ZonaGolApiService
5. Verificar respuesta y mostrar resultado al usuario

```dart
Future<void> registerPlayerFace(String playerId, File imageFile) async {
  // 1. Inicializar detector facial
  final faceDetector = GoogleMlKit.vision.faceDetector(
    FaceDetectorOptions(
      enableClassification: true,
      minFaceSize: 0.15,
    ),
  );
  
  // 2. Detectar caras
  final inputImage = InputImage.fromFile(imageFile);
  final faces = await faceDetector.processImage(inputImage);
  
  if (faces.isEmpty) {
    // Mostrar error: No se detectó cara
    return;
  }
  
  // 3. Extraer embedding
  final faceService = FaceRecognitionTFLiteService();
  await faceService.loadModel();
  
  final embedding = await faceService.extractFaceEmbedding(imageFile, faces.first);
  if (embedding == null) {
    // Mostrar error: No se pudo extraer embedding
    return;
  }
  
  // 4. Calcular quality score
  final qualityScore = _calculateQualityScore(faces.first, imageFile);
  
  // 5. Enviar al backend
  final apiService = ZonaGolApiService(baseUrl: 'https://zona-gol.example.com');
  final success = await apiService.syncPlayerEmbedding(
    playerId: playerId,
    embedding: embedding,
    qualityScore: qualityScore,
  );
  
  if (success) {
    // Mostrar éxito
  } else {
    // Mostrar error
  }
}

double _calculateQualityScore(Face face, File imageFile) {
  // Evaluar múltiples factores de calidad
  final headEulerAngleY = face.headEulerAngleY ?? 0.0;
  final headEulerAngleX = face.headEulerAngleX ?? 0.0;
  
  // Penalizar si la cara no está frontal
  final poseScore = 1.0 - (math.min(math.abs(headEulerAngleY), 45.0) / 45.0) - 
                         (math.min(math.abs(headEulerAngleX), 45.0) / 45.0);
  
  // Evaluar tamaño de la cara relativo a la imagen
  final faceWidth = face.boundingBox.width;
  final faceHeight = face.boundingBox.height;
  
  // Obtener dimensiones de la imagen (aproximado)
  final imageWidth = 640.0; // Valor aproximado si no se puede obtener
  final imageHeight = 480.0; // Valor aproximado si no se puede obtener
  
  final imageArea = imageWidth * imageHeight;
  final faceArea = faceWidth * faceHeight;
  final sizeScore = math.min(1.0, (faceArea / imageArea) * 10);
  
  // Evaluar confianza de detección
  final detectionScore = face.trackingId != null ? 1.0 : 0.7;
  
  // Combinar factores con diferentes pesos
  final qualityScore = 0.4 * poseScore + 0.4 * sizeScore + 0.2 * detectionScore;
  
  // Limitar entre 0 y 1
  return math.max(0.0, math.min(1.0, qualityScore));
}
```

## Verificación de Compatibilidad

Para verificar que los embeddings generados por Flutter son compatibles con los de la plataforma web:

1. Ejecuta el script de prueba de compatibilidad:

```bash
cd scripts
npm install
node test-embedding-compatibility.js flutter-embeddings.json web-embeddings.json
```

2. Verifica que la similitud promedio sea mayor a 0.7 para confirmar la compatibilidad.

## Solución de Problemas

### Embeddings Incompatibles

Si los embeddings generados por Flutter y la plataforma web no son compatibles:

1. Verifica que ambos usan el mismo modelo MobileFaceNet
2. Confirma que el preprocesamiento de imágenes sea idéntico
3. Asegura que la normalización L2 se aplique correctamente
4. Revisa la extracción de la región facial con padding

### Errores de Detección Facial

Si hay problemas con la detección facial:

1. Verifica la iluminación de la imagen
2. Asegúrate de que la cara esté centrada y visible
3. Prueba con diferentes configuraciones de FaceDetectorOptions

## Recursos Adicionales

- [Documentación de TensorFlow Lite para Flutter](https://www.tensorflow.org/lite/guide/flutter)
- [Google ML Kit para Flutter](https://developers.google.com/ml-kit/guides)
- [Especificación de Embeddings Faciales](./FACE_EMBEDDING_SPEC.md)
