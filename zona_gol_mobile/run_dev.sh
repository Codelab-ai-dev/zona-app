#!/bin/bash

# Script para correr la app en modo desarrollo
# Uso: ./run_dev.sh [dispositivo]
# Ejemplos:
#   ./run_dev.sh                    # Corre en el dispositivo por defecto
#   ./run_dev.sh "iPhone 17"        # Corre en iPhone 17
#   ./run_dev.sh chrome             # Corre en Chrome (web)

DEVICE=${1:-}

echo "🚀 Ejecutando Zona Gol Mobile en modo desarrollo..."

if [ -z "$DEVICE" ]; then
  flutter run
else
  flutter run -d "$DEVICE"
fi
