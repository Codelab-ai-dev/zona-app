#!/bin/bash

# Navegar al directorio del proyecto
cd /Users/gustavo/Desktop/zona-app/zona-gol

# Instalar TensorFlow.js y modelos relacionados
npm install @tensorflow/tfjs @tensorflow/tfjs-node @tensorflow-models/blazeface @tensorflow-models/face-landmarks-detection

# Instalar herramientas para conversión de modelos (opcional)
npm install @tensorflow/tfjs-converter --save-dev

echo "Instalación completada. Bibliotecas de TensorFlow.js añadidas al proyecto."
