#!/bin/bash

# Development Build Script
# Allows SSL bypass and cleartext traffic for local testing

echo "🔧 Building DEVELOPMENT version..."
echo "⚠️  This build allows SSL bypass and cleartext traffic"
echo "⚠️  DO NOT distribute this build to users!"
echo ""

# Run in development mode
flutter run \
  --dart-define=ENV=dev

echo ""
echo "✅ Development build running"
