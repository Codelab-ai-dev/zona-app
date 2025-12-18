# 📱 Build Instructions - Zona Gol

## Quick Start

### Development (Local Testing)

```bash
# Simple - just run
flutter run

# Or explicitly specify environment
flutter run --dart-define=ENV=dev
```

**What you get:**
- ⚠️ SSL bypass enabled (for self-signed certs)
- ⚠️ Cleartext traffic allowed
- ✅ Debug logs enabled
- ✅ Fast development cycle

**⚠️ WARNING:** Never distribute this build to users!

---

### Production (App Store / Play Store)

#### Option 1: Using Helper Script (Recommended)

```bash
# Set environment variables
export SUPABASE_URL="https://srv1190257.hstgr.cloud"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Run build script
./scripts/build_prod.sh
```

#### Option 2: Manual Command

```bash
flutter build apk --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=https://srv1190257.hstgr.cloud \
  --dart-define=SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**What you get:**
- ✅ SSL certificate validation ENABLED
- ✅ Cleartext traffic DISABLED
- ✅ Debug logs DISABLED
- ✅ Secure for distribution

**Output:**
```
build/app/outputs/flutter-apk/app-release.apk
```

---

### Staging (Testing Before Production)

```bash
# Set staging environment variables
export STAGING_SUPABASE_URL="https://your-staging.supabase.co"
export STAGING_SUPABASE_ANON_KEY="your_staging_key"

# Run staging build
./scripts/build_staging.sh
```

---

## Environment Variables

### Required for Production Build

| Variable | Description | Example |
|----------|-------------|---------|
| `ENV` | Environment (dev/staging/prod) | `prod` |
| `SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | `eyJhbGci...` |

### How to Set Variables

#### Linux/macOS

```bash
export SUPABASE_URL="https://srv1190257.hstgr.cloud"
export SUPABASE_ANON_KEY="your_key_here"
```

#### Windows (PowerShell)

```powershell
$env:SUPABASE_URL="https://srv1190257.hstgr.cloud"
$env:SUPABASE_ANON_KEY="your_key_here"
```

#### Windows (CMD)

```cmd
set SUPABASE_URL=https://srv1190257.hstgr.cloud
set SUPABASE_ANON_KEY=your_key_here
```

---

## Build Variants

### Android

#### Debug Build (Development)

```bash
flutter build apk --debug --dart-define=ENV=dev
```

**Characteristics:**
- Large file size (~40-60 MB)
- Includes debug symbols
- SSL bypass allowed
- Not suitable for distribution

---

#### Release Build (Production)

```bash
flutter build apk --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=... \
  --dart-define=SUPABASE_ANON_KEY=...
```

**Characteristics:**
- Optimized file size (~15-25 MB)
- No debug symbols
- SSL validation enabled
- Ready for distribution

---

#### App Bundle (Google Play)

```bash
flutter build appbundle --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=... \
  --dart-define=SUPABASE_ANON_KEY=...
```

**Output:**
```
build/app/outputs/bundle/release/app-release.aab
```

**When to use:**
- Uploading to Google Play Store
- Smaller download size for users
- Supports dynamic delivery

---

### iOS

#### Development

```bash
flutter run --dart-define=ENV=dev
```

---

#### Production

```bash
flutter build ios --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=... \
  --dart-define=SUPABASE_ANON_KEY=...
```

Then open Xcode and:
1. Open `ios/Runner.xcworkspace`
2. Select Product → Archive
3. Distribute to App Store

---

## Build Configuration Summary

| Environment | SSL Bypass | Cleartext | Debug Logs | Use Case |
|-------------|-----------|-----------|------------|----------|
| **dev** | ✅ Yes | ✅ Yes | ✅ Yes | Local development |
| **staging** | ❌ No | ❌ No | ✅ Yes | QA testing |
| **prod** | ❌ No | ❌ No | ❌ No | App Store distribution |

---

## Verification

### How to Verify Your Build is Secure

#### 1. Check Console Output

When you run the app, you should see:

**Development:**
```
═══════════════════════════════════════════════
🔧 APP CONFIGURATION
═══════════════════════════════════════════════
Environment:           dev
Is Production:         false
SSL Bypass Allowed:    true ⚠️
Cleartext Allowed:     true ⚠️
Debug Logs:            true
═══════════════════════════════════════════════
```

**Production:**
```
═══════════════════════════════════════════════
🔧 APP CONFIGURATION
═══════════════════════════════════════════════
Environment:           prod
Is Production:         true
SSL Bypass Allowed:    false ✅
Cleartext Allowed:     false ✅
Debug Logs:            false
═══════════════════════════════════════════════
```

---

#### 2. Test SSL Validation

In production build:

1. **Try to connect to a server with invalid SSL certificate**
   - ✅ Should fail with SSL error
   - ❌ If it connects → build is insecure

2. **Check network traffic with mitmproxy**
   - ✅ Should NOT be able to intercept HTTPS traffic
   - ❌ If you can see traffic → SSL bypass is active

---

#### 3. Inspect APK

```bash
# Extract APK
unzip app-release.apk -d apk_contents

# Check manifest for cleartext
grep "usesCleartextTraffic" apk_contents/AndroidManifest.xml

# Production should show:
# android:usesCleartextTraffic="false"

# OR no cleartext attribute at all (defaults to false)
```

---

## Common Issues

### Issue 1: "SUPABASE_URL must be provided"

**Error:**
```
❌ PRODUCTION ERROR: SUPABASE_URL must be provided via --dart-define
```

**Solution:**
```bash
# Make sure to pass both URL and key
flutter build apk --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=https://... \  ← Add this
  --dart-define=SUPABASE_ANON_KEY=...       ← Add this
```

---

### Issue 2: SSL Bypass Still Active in Production

**Error:**
```
❌ CRITICAL SECURITY ERROR: Attempting to use DevHttpOverrides in production build!
```

**This is GOOD!** It means the safeguard is working.

**Solution:**
```bash
# Make sure ENV=prod
flutter build apk --release --dart-define=ENV=prod
```

---

### Issue 3: App Crashes on Startup

**Check:**
1. Are all required --dart-define flags set?
2. Is SUPABASE_URL correct?
3. Is SUPABASE_ANON_KEY correct?

**Debug:**
```bash
# Run with debug output
flutter run --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=... \
  --dart-define=SUPABASE_ANON_KEY=...

# Check console for errors
```

---

### Issue 4: "Connection refused" in Production

**Possible causes:**

1. **SSL certificate invalid**
   - Your server's SSL cert is not trusted
   - Solution: Get proper SSL cert from Let's Encrypt or similar

2. **Wrong URL**
   - Check SUPABASE_URL is correct
   - Should include `https://`

3. **Firewall blocking**
   - Server firewall blocking connection
   - Check server security groups

---

## Pre-Release Checklist

Before distributing your app:

### Security Checklist

- [ ] Build with `ENV=prod`
- [ ] SSL bypass is DISABLED
- [ ] Cleartext traffic is DISABLED
- [ ] Supabase credentials from environment variables (not hardcoded)
- [ ] RLS policies enabled on all tables
- [ ] Test on real device with production server
- [ ] Verify SSL validation works (try connecting to server with bad cert - should fail)

### Functional Checklist

- [ ] App connects to production Supabase
- [ ] Login works
- [ ] Offline mode works
- [ ] QR scanning works
- [ ] Match attendance marking works
- [ ] Tournaments load correctly
- [ ] No debug logs in console
- [ ] App doesn't crash on startup

### Build Checklist

- [ ] App version bumped in `pubspec.yaml`
- [ ] Build number incremented
- [ ] APK file size reasonable (<30 MB)
- [ ] Icons and branding correct
- [ ] App name is "Zona-Gol"

---

## Continuous Integration (CI/CD)

### GitHub Actions Example

```yaml
name: Build Production APK

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.8.1'

      - name: Build APK
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          flutter build apk --release \
            --dart-define=ENV=prod \
            --dart-define=SUPABASE_URL=$SUPABASE_URL \
            --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-release.apk
          path: build/app/outputs/flutter-apk/app-release.apk
```

**Set secrets in GitHub:**
1. Go to repo → Settings → Secrets
2. Add `SUPABASE_URL`
3. Add `SUPABASE_ANON_KEY`

---

## Distribution

### Google Play Store

1. **Build App Bundle:**
   ```bash
   ./scripts/build_prod.sh
   # Or manually:
   flutter build appbundle --release --dart-define=...
   ```

2. **Upload to Play Console:**
   - Go to Google Play Console
   - Create new release
   - Upload `app-release.aab`
   - Add release notes
   - Submit for review

---

### Direct APK Distribution

1. **Build APK:**
   ```bash
   ./scripts/build_prod.sh
   ```

2. **Sign APK (if not auto-signed):**
   ```bash
   jarsigner -verbose -sigalg SHA256withRSA \
     -digestalg SHA-256 \
     -keystore my-release-key.jks \
     app-release.apk alias_name
   ```

3. **Distribute:**
   - Upload to website
   - Share via email
   - Use Firebase App Distribution

**⚠️ Warning:** Users need to enable "Install from unknown sources"

---

### App Store (iOS)

1. **Build iOS:**
   ```bash
   flutter build ios --release --dart-define=ENV=prod ...
   ```

2. **Open Xcode:**
   ```bash
   open ios/Runner.xcworkspace
   ```

3. **Archive:**
   - Product → Archive
   - Organizer → Distribute App
   - App Store Connect
   - Upload

---

## Version Management

### Updating Version

Edit `pubspec.yaml`:

```yaml
version: 1.1.0+2
#        ↑     ↑
#        |     Build number (increment for each release)
#        Version name (semantic versioning)
```

**Semantic Versioning:**
- `1.0.0` → `1.0.1` : Bug fixes
- `1.0.0` → `1.1.0` : New features (backwards compatible)
- `1.0.0` → `2.0.0` : Breaking changes

---

## Scripts Reference

All scripts are in `scripts/` directory:

| Script | Purpose | Environment |
|--------|---------|-------------|
| `build_dev.sh` | Run development version | dev |
| `build_staging.sh` | Build staging APK | staging |
| `build_prod.sh` | Build production APK | prod |

**Make executable:**
```bash
chmod +x scripts/*.sh
```

---

## Getting Help

**Issues:**
- Check `SECURITY.md` for security-related questions
- Check `RLS_EXPLAINED.md` for database security
- Check console output for error messages

**Common Errors:**
1. Missing --dart-define flags → See "Common Issues" above
2. SSL validation failing → Check server certificate
3. RLS blocking requests → Check `RLS_EXPLAINED.md`

---

**Last Updated:** 2025-12-13
**Flutter Version:** 3.8.1
**Dart Version:** 3.8.1
