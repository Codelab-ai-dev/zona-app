# Guía para Convertir MobileFaceNet de TFLite a TensorFlow.js

## Requisitos previos
- Python 3.7+
- TensorFlow 2.x
- TensorFlow.js Converter

## Pasos para la conversión

### 1. Instalar dependencias
```bash
pip install tensorflow tensorflowjs
```

### 2. Convertir de TFLite a SavedModel
Primero necesitamos convertir el modelo TFLite a un formato SavedModel de TensorFlow:

```python
import tensorflow as tf

# Cargar el modelo TFLite
interpreter = tf.lite.Interpreter(model_path="assets/models/mobilefacenet.tflite")
interpreter.allocate_tensors()

# Obtener información del modelo
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Crear un modelo SavedModel equivalente
input_shape = input_details[0]['shape']
model = tf.keras.Sequential([
    tf.keras.layers.InputLayer(input_shape=input_shape[1:]),
    tf.keras.layers.Lambda(lambda x: x)  # Placeholder para la conversión
])

# Compilar el modelo
model.compile(optimizer='adam', loss='mse')

# Guardar como SavedModel
tf.saved_model.save(model, "saved_model_dir")
```

### 3. Convertir de SavedModel a TensorFlow.js
```bash
tensorflowjs_converter \
  --input_format=tf_saved_model \
  --output_format=tfjs_graph_model \
  --signature_name=serving_default \
  --saved_model_tags=serve \
  saved_model_dir \
  public/models/mobilefacenet
```

### 4. Verificar la conversión
Después de la conversión, deberías tener estos archivos en `public/models/mobilefacenet/`:
- `model.json` - Metadatos del modelo
- Varios archivos `*.bin` - Pesos del modelo

### Notas importantes
- El modelo TFLite en Flutter tiene dimensiones de entrada [1, 112, 112, 3]
- El modelo TensorFlow.js debe tener las mismas dimensiones de entrada
- La normalización de píxeles debe ser idéntica en ambas plataformas
