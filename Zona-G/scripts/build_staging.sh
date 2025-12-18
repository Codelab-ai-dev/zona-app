#!/bin/bash

# Staging Build Script
# Secure build for testing before production

set -e  # Exit on error

echo "🧪 Building STAGING version..."
echo "✅ SSL certificate validation ENABLED"
echo "✅ Cleartext traffic DISABLED"
echo "✅ Debug logs ENABLED (for testing)"
echo ""

# Check if Supabase credentials are set
if [ -z "$STAGING_SUPABASE_URL" ] || [ -z "$STAGING_SUPABASE_ANON_KEY" ]; then
    echo "❌ ERROR: STAGING_SUPABASE_URL and STAGING_SUPABASE_ANON_KEY must be set"
    echo ""
    echo "Usage:"
    echo "  export STAGING_SUPABASE_URL=https://your-staging.supabase.co"
    echo "  export STAGING_SUPABASE_ANON_KEY=your_staging_key"
    echo "  ./scripts/build_staging.sh"
    echo ""
    exit 1
fi

echo "🔵 Staging URL: $STAGING_SUPABASE_URL"
echo ""

# Build release APK
flutter build apk --release \
  --dart-define=ENV=staging \
  --dart-define=SUPABASE_URL="$STAGING_SUPABASE_URL" \
  --dart-define=SUPABASE_ANON_KEY="$STAGING_SUPABASE_ANON_KEY"

echo ""
echo "✅ Staging APK built successfully!"
echo "📁 Location: build/app/outputs/flutter-apk/app-release.apk"
echo ""
echo "ℹ️  This is a staging build:"
echo "  - Secure SSL validation"
echo "  - Debug logs enabled (for QA)"
echo "  - Safe for internal testing"
