#!/bin/bash

# Navegar al directorio de scripts
cd /Users/gustavo/Desktop/zona-app/scripts

# Crear package.json si no existe
if [ ! -f package.json ]; then
  echo '{
  "name": "embedding-compatibility-tests",
  "version": "1.0.0",
  "description": "Tests para verificar compatibilidad de embeddings faciales",
  "main": "test-embedding-compatibility.js",
  "scripts": {
    "test": "node test-embedding-compatibility.js"
  },
  "author": "",
  "license": "ISC"
}' > package.json
fi

# Instalar dependencias
npm install @tensorflow/tfjs-node

# Crear directorio para datos de prueba
mkdir -p test-data

echo "Instalación completada. Ejecuta el test con: npm run test"
