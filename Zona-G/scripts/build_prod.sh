#!/bin/bash

# Production Build Script
# Builds secure APK for distribution

set -e  # Exit on error

echo "🔒 Building PRODUCTION version..."
echo "✅ SSL certificate validation ENABLED"
echo "✅ Cleartext traffic DISABLED"
echo ""

# Check if Supabase credentials are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set as environment variables"
    echo ""
    echo "Usage:"
    echo "  export SUPABASE_URL=https://your-project.supabase.co"
    echo "  export SUPABASE_ANON_KEY=your_anon_key_here"
    echo "  ./scripts/build_prod.sh"
    echo ""
    exit 1
fi

echo "🔵 Supabase URL: $SUPABASE_URL"
echo "🔵 Supabase Key: ${SUPABASE_ANON_KEY:0:20}...[REDACTED]"
echo ""

# Build release APK
echo "📦 Building release APK..."
flutter build apk --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL="$SUPABASE_URL" \
  --dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"

echo ""
echo "✅ Production APK built successfully!"
echo "📁 Location: build/app/outputs/flutter-apk/app-release.apk"
echo ""
echo "🔒 Security checklist:"
echo "  ✅ SSL bypass disabled"
echo "  ✅ Cleartext traffic disabled"
echo "  ✅ Debug logs disabled"
echo "  ✅ Environment: production"
echo ""
echo "⚠️  Before distributing:"
echo "  1. Test the APK thoroughly"
echo "  2. Verify RLS policies are enabled"
echo "  3. Check that SSL validation works"
echo "  4. Test on real device with production server"
