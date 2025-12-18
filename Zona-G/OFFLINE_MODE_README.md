# Offline-First Mode - Zona Gol App

## 📱 Overview

La aplicación Zona Gol ahora soporta **modo offline-first** con sesión cacheada. Esto permite que usuarios autenticados puedan usar la aplicación en campos de fútbol con conectividad limitada.

## ✨ Features Implementadas

### 1. **Session Caching (Caché de Sesión)**
- ✅ Tokens de acceso y refresh almacenados de forma segura con `flutter_secure_storage`
- ✅ TTL configurable de 48 horas para sesiones cacheadas
- ✅ Validación automática de expiración de sesión
- ✅ Re-autenticación automática cuando se restaura conexión

### 2. **Data Caching (Caché de Datos)**
- ✅ Perfil de usuario cacheado (role, league_id, team_id)
- ✅ Lista de torneos cacheada con TTL de 24 horas
- ✅ Datos no sensibles almacenados en `shared_preferences`
- ✅ Versioning del caché para manejar cambios de esquema

### 3. **Network Detection (Detección de Red)**
- ✅ Monitoreo en tiempo real de conectividad con `connectivity_plus`
- ✅ Eventos de conexión/desconexión
- ✅ UI reactiva que se adapta al estado de conexión

### 4. **Offline UI Indicators (Indicadores de UI)**
- ✅ Banner naranja cuando está offline
- ✅ Badge "Offline" en AppBar
- ✅ Snackbars notificando cambios de conectividad
- ✅ Botón de sincronización manual

### 5. **Sync & Revalidation (Sincronización)**
- ✅ Refresh automático de sesión al reconectar
- ✅ Revalidación de permisos y roles
- ✅ Detección de cambios en permisos (role, league, team)
- ✅ Limpieza de caché obsoleto al detectar cambios

## 🏗️ Arquitectura

### Servicios Principales

#### **CacheService** (`lib/services/cache_service.dart`)
Maneja todo el almacenamiento offline:

```dart
// Secure storage (tokens)
await cacheService.cacheSession(
  accessToken: token,
  refreshToken: refreshToken,
  expiresAt: DateTime.now().add(Duration(hours: 48)),
);

// Non-sensitive storage (tournaments, profile)
await cacheService.cacheTournaments(tournaments);
await cacheService.cacheUserProfile(profile);
```

**Características:**
- TTL automático: 48h para sesiones, 24h para datos
- Versionado: Limpia cache al actualizar app
- Seguridad: Tokens en Keychain (iOS) / Keystore (Android)

#### **ConnectivityService** (`lib/services/connectivity_service.dart`)
Monitorea el estado de la red:

```dart
// Check current status
bool isOnline = connectivityService.isOnline;

// Listen to changes
connectivityService.connectivityStream.listen((isOnline) {
  if (isOnline) {
    // Network restored!
  }
});
```

#### **OfflineSessionManager** (`lib/services/offline_session_manager.dart`)
Coordina sesión offline y sincronización:

```dart
// Check if can access app
bool canAccess = await sessionManager.canAccessApp();

// Force manual sync
await sessionManager.forceSyncNow();

// Get offline status
Map status = await sessionManager.getOfflineStatus();
```

### Widgets

#### **OfflineBanner** (`lib/widgets/offline_banner.dart`)
Banner naranja visible cuando está offline:

```dart
Column(
  children: [
    const OfflineBanner(),
    Expanded(child: yourContent),
  ],
)
```

#### **OfflineIndicator** (`lib/widgets/offline_indicator.dart`)
Badge compacto para AppBar:

```dart
AppBar(
  actions: [
    const OfflineIndicator(),
    // other actions...
  ],
)
```

#### **OfflineGate** (`lib/widgets/offline_gate.dart`)
Protege rutas que requieren autenticación:

```dart
OfflineGate(
  routeName: 'Tournaments',
  child: TournamentsListScreen(),
)
```

## 🚀 Flujo de Uso

### Escenario 1: Login Online → Uso Offline

1. **Usuario se conecta con internet**
   ```
   ✅ Login exitoso
   ✅ Session cacheada (48h TTL)
   ✅ Perfil cacheado
   ✅ Torneos cacheados (24h TTL)
   ```

2. **Usuario pierde conexión**
   ```
   📵 App detecta offline
   🟠 Banner naranja aparece
   ✅ Carga torneos desde cache
   ✅ Puede navegar normalmente
   ```

3. **Usuario recupera conexión**
   ```
   🟢 App detecta online
   🔄 Refresh automático de session
   🔄 Revalida permisos
   ✅ Sincroniza cambios
   ```

### Escenario 2: Intentar Login Offline

```
❌ Bloqueado por OfflineGate
⚠️ "No hay conexión a internet. Para iniciar sesión por primera vez necesitas estar conectado."
```

### Escenario 3: Cache Expirado + Offline

```
❌ Session TTL expirado (>48h)
⚠️ "Tu sesión ha expirado. Por favor, inicia sesión nuevamente."
➡️ Redirect a LoginScreen
```

## 📊 Configuración de TTL

Puedes ajustar los TTLs en `lib/services/cache_service.dart`:

```dart
// Current values
static const Duration sessionTTL = Duration(hours: 48);  // 2 días
static const Duration dataTTL = Duration(hours: 24);     // 1 día
```

**Recomendaciones:**
- **sessionTTL:** 24-72 horas (default: 48h)
- **dataTTL:** 12-48 horas (default: 24h)
- Considerar el refresh token expiry de Supabase (7 días por default)

## 🔐 Seguridad

### Tokens (Sensitive Data)
- ✅ Almacenados en `flutter_secure_storage`
- ✅ Encriptados en Keychain (iOS) / Keystore (Android)
- ✅ Nunca expuestos en logs
- ✅ Eliminados al logout

### Profile & Tournaments (Non-Sensitive)
- ✅ Almacenados en `shared_preferences`
- ✅ No incluyen información confidencial
- ✅ Versionados para evitar esquemas obsoletos

### Permisos
- ✅ Revalidación de role al reconectar
- ✅ Detección de cambios (league_id, team_id, role)
- ✅ Limpieza automática de datos no autorizados

## 🐛 Debugging

### Ver Estado de Cache

Agrega este código temporal en tu screen:

```dart
final cacheService = CacheService();
final stats = await cacheService.getCacheStats();
print('Cache Stats: $stats');
```

Output:
```json
{
  "has_session": true,
  "session_valid": true,
  "session_cached_at": "2025-12-13T10:30:00.000Z",
  "has_profile": true,
  "tournaments_count": 5,
  "matches_count": 0,
  "players_count": 0,
  "cache_version": 1
}
```

### Ver Estado de Conectividad

```dart
final connectivity = ConnectivityService();
final details = await connectivity.getConnectivityDetails();
print('Connectivity: $details');
```

Output:
```json
{
  "is_online": true,
  "connection_types": ["wifi"],
  "has_wifi": true,
  "has_mobile": false,
  "has_ethernet": false
}
```

### Logs de Console

Busca estos prefijos:
- `🔵` - Inicialización
- `✅` - Operación exitosa
- `❌` - Error
- `⚠️` - Warning
- `🔄` - Sincronización
- `📵` - Modo offline
- `🟢` - Conexión restaurada
- `🔴` - Conexión perdida

## 🧪 Testing

### Test Manual: Simular Offline

**En iOS Simulator:**
1. Settings → Network Link Conditioner → 100% Loss

**En Android Emulator:**
1. Extended Controls (⋮) → Cellular → Data: Denied

**En Dispositivo Real:**
1. Activar modo avión

### Test de Expiración de Cache

```dart
// Cambiar temporalmente el TTL a 1 minuto para pruebas
static const Duration sessionTTL = Duration(minutes: 1);
```

## 📝 TODO Futuro (MVP Level 2)

### Actualmente NO Implementado:

1. **Match Data Caching**
   - Cachear partidos de la semana actual
   - Permitir check-in de jugadores offline
   - Queue de operaciones pendientes

2. **Player Data Caching**
   - Cachear jugadores de torneos accesibles
   - Validación offline de QR codes
   - Fotos de jugadores cacheadas

3. **Sync Queue**
   - Queue de operaciones pendientes (check-ins, updates)
   - Retry logic para operaciones fallidas
   - Conflict resolution (last-write-wins)

4. **Offline QR Validation**
   - Validar QR codes contra cache local
   - Guardar check-ins para sincronizar después
   - Modo "offline-only" para emergencias

### Para implementar MVP Level 2:

Ver comentario `TODO` en:
- `lib/services/offline_session_manager.dart` línea ~200
- Método `_syncPendingOperations()`

## 🔧 Troubleshooting

### "Session cacheada pero no puedo acceder offline"

**Causa:** TTL expirado

**Solución:**
```dart
final isValid = await cacheService.isSessionValid();
print('Session valid: $isValid'); // false = expirado

// Conectarse a internet para refresh
```

### "Banner offline no desaparece al conectar"

**Causa:** `connectivity_plus` no detectó cambio

**Solución:**
```dart
// Forzar check manual
final connectivity = ConnectivityService();
await connectivity.checkConnectivity();
```

### "Datos antiguos en cache"

**Causa:** Cache no se ha actualizado

**Solución:**
```dart
// Incrementar cache version en cache_service.dart
static const int currentCacheVersion = 2; // era 1
```

### "Error al guardar en secure storage"

**Causa:** iOS Keychain / Android Keystore bloqueado

**Solución:**
- iOS: Desbloquear dispositivo
- Android: Verificar que device tenga lock screen configurado

## 📚 Referencias

- **flutter_secure_storage:** https://pub.dev/packages/flutter_secure_storage
- **connectivity_plus:** https://pub.dev/packages/connectivity_plus
- **shared_preferences:** https://pub.dev/packages/shared_preferences
- **Supabase Session Management:** https://supabase.com/docs/guides/auth/sessions

## 🎯 Mejores Prácticas

1. **Siempre cachear después de operaciones online exitosas**
   ```dart
   final data = await supabase.from('table').select();
   await cacheService.cacheData(data); // ✅
   ```

2. **Manejar errores con fallback a cache**
   ```dart
   try {
     return await fetchFromServer();
   } catch (e) {
     return await loadFromCache(); // Fallback
   }
   ```

3. **No asumir que cache existe**
   ```dart
   final cached = await cache.getData();
   if (cached != null) {
     // Use cached data
   } else {
     // Show empty state
   }
   ```

4. **Revalidar en background cuando sea posible**
   ```dart
   // Show cached data immediately
   final cached = await cache.getData();
   showData(cached);

   // Fetch fresh data in background
   if (isOnline) {
     final fresh = await fetchFresh();
     await cache.update(fresh);
     showData(fresh); // Update UI
   }
   ```

---

**Implementado por:** Claude Code
**Fecha:** 2025-12-13
**Versión:** 1.0.0
**Estado:** MVP Level 1 ✅ Completado
