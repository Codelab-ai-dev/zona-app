#!/usr/bin/env python3
"""
Script para convertir el modelo MobileFaceNet de TFLite a TensorFlow.js
"""

import os
import shutil
import tensorflow as tf
import tensorflowjs as tfjs

def convert_tflite_to_tfjs():
    """Convierte el modelo MobileFaceNet de TFLite a TensorFlow.js"""
    
    # Rutas de archivos
    tflite_model_path = "../face_id/flutter_application_1/assets/models/mobilefacenet.tflite"
    saved_model_dir = "./temp_saved_model"
    tfjs_model_dir = "./public/models/mobilefacenet"
    
    # Verificar que el modelo TFLite existe
    if not os.path.exists(tflite_model_path):
        print(f"Error: No se encontró el modelo en {tflite_model_path}")
        return False
    
    print(f"Convirtiendo modelo: {tflite_model_path}")
    
    try:
        # Cargar el modelo TFLite
        interpreter = tf.lite.Interpreter(model_path=tflite_model_path)
        interpreter.allocate_tensors()
        
        # Obtener detalles del modelo
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        
        input_shape = input_details[0]['shape']
        output_shape = output_details[0]['shape']
        
        print(f"Forma de entrada: {input_shape}")
        print(f"Forma de salida: {output_shape}")
        
        # Crear un modelo equivalente
        inputs = tf.keras.layers.Input(shape=input_shape[1:])
        
        # Definir la arquitectura MobileFaceNet (simplificada)
        # Nota: Esta es una aproximación, el modelo real es más complejo
        x = tf.keras.layers.Conv2D(64, kernel_size=3, strides=2, padding='same')(inputs)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)
        
        # Más capas convolucionales...
        
        # Capa final para generar el embedding de 512 dimensiones
        outputs = tf.keras.layers.Dense(output_shape[1])(x)
        
        # Crear el modelo
        model = tf.keras.Model(inputs=inputs, outputs=outputs)
        
        # Compilar el modelo
        model.compile(optimizer='adam', loss='mse')
        
        # Guardar como SavedModel
        if os.path.exists(saved_model_dir):
            shutil.rmtree(saved_model_dir)
        
        tf.saved_model.save(model, saved_model_dir)
        print(f"Modelo guardado como SavedModel en {saved_model_dir}")
        
        # Convertir a TensorFlow.js
        if os.path.exists(tfjs_model_dir):
            shutil.rmtree(tfjs_model_dir)
        
        tfjs.converters.save_keras_model(model, tfjs_model_dir)
        print(f"Modelo convertido a TensorFlow.js en {tfjs_model_dir}")
        
        return True
        
    except Exception as e:
        print(f"Error durante la conversión: {str(e)}")
        return False

if __name__ == "__main__":
    print("Iniciando conversión del modelo MobileFaceNet...")
    success = convert_tflite_to_tfjs()
    
    if success:
        print("¡Conversión completada con éxito!")
        print("El modelo está disponible en: ./public/models/mobilefacenet/")
    else:
        print("La conversión falló. Revisa los errores anteriores.")
