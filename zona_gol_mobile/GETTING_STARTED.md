# 🚀 Getting Started - Zona Gol Mobile

## ✅ Lo que ya está hecho

### 1. Estructura del Proyecto ✓
- ✅ Arquitectura Clean Architecture definida
- ✅ Estructura de carpetas completa creada
- ✅ Dependencias instaladas (30+ packages)

### 2. Core Layer ✓
- ✅ `app_config.dart` - Configuración por ambiente (dev/staging/prod)
- ✅ `app_constants.dart` - Constantes de la app
- ✅ `storage_keys.dart` - Keys para storage
- ✅ `theme.dart` - Theme completo (light/dark)
- ✅ `exceptions.dart` - Excepciones customizadas
- ✅ `failures.dart` - Failures para manejo de errores
- ✅ `string_extensions.dart` - Extensiones útiles para String
- ✅ `datetime_extensions.dart` - Extensiones útiles para DateTime

---

## 📋 Próximos Pasos

### Fase 1: Modelos de Datos (Prioridad Alta)
Crear los modelos de datos que mapean a tu base de datos Supabase:

**Archivos a crear en `lib/data/models/`:**
- `user_model.dart` - Usuario con roles
- `league_model.dart` - Liga
- `tournament_model.dart` - Torneo (3 formatos)
- `team_model.dart` - Equipo
- `player_model.dart` - Jugador
- `match_model.dart` - Partido
- `team_stats_model.dart` - Estadísticas de equipo
- `player_stats_model.dart` - Estadísticas de jugador
- `attendance_model.dart` - Asistencia QR
- `suspension_model.dart` - Suspensiones

**Usar Freezed para modelos inmutables:**
```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

@freezed
class UserModel with _$UserModel {
  const factory UserModel({
    required String id,
    required String email,
    String? name,
    @JsonKey(name: 'user_role') required String role,
    @JsonKey(name: 'created_at') DateTime? createdAt,
  }) = _UserModel;

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);
}
```

### Fase 2: Servicios Base (Prioridad Alta)
Implementar servicios fundamentales:

**`lib/data/datasources/remote/supabase_client.dart`:**
- Cliente Supabase singleton
- Configuración de auth
- Configuración de storage
- Configuración de realtime

**`lib/data/datasources/local/secure_storage_service.dart`:**
- Wrapper para flutter_secure_storage
- Métodos para guardar/leer tokens
- Métodos para sesión

**`lib/data/datasources/local/hive_service.dart`:**
- Inicialización de Hive
- Métodos CRUD para cada box
- Métodos de limpieza de caché

### Fase 3: Autenticación (Prioridad Alta)
Sistema completo de auth:

**BLoC de Autenticación:**
- `lib/presentation/blocs/auth/auth_bloc.dart`
- `lib/presentation/blocs/auth/auth_event.dart`
- `lib/presentation/blocs/auth/auth_state.dart`

**Use Cases:**
- `lib/domain/usecases/auth/login_usecase.dart`
- `lib/domain/usecases/auth/login_with_google.dart`
- `lib/domain/usecases/auth/login_with_apple.dart`
- `lib/domain/usecases/auth/logout_usecase.dart`

**Screens:**
- `lib/presentation/screens/auth/login_screen.dart`
- `lib/presentation/screens/auth/register_screen.dart`

### Fase 4: Navegación (Prioridad Alta)
Sistema de routing con Go Router:

**`lib/core/config/routes.dart`:**
- Definir todas las rutas
- Guards por rol
- Redirect logic basado en auth state

### Fase 5: Dashboards (Prioridad Media)
Pantallas principales por rol:

- `lib/presentation/screens/super_admin/super_admin_dashboard.dart`
- `lib/presentation/screens/league_admin/league_dashboard.dart`
- `lib/presentation/screens/team_owner/team_owner_dashboard.dart`
- `lib/presentation/screens/public/public_home_screen.dart`

### Fase 6: Features Core - League Admin (Prioridad Media)
Funcionalidad administrativa principal:

- Gestión de torneos
- Gestión de equipos
- Generador de fixtures
- Entrada de resultados
- Tabla de posiciones
- QR Scanner (de Zona-G existente)

### Fase 7: Offline Sync (Prioridad Media-Baja)
Sistema de sincronización:

- Sync queue con Hive
- Background sync service
- Conflict resolution
- Connectivity listener

---

## 🛠️ Comandos Útiles

### Generar código (Freezed + JSON Serializable)
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

### Limpiar cache de build_runner
```bash
flutter pub run build_runner clean
```

### Run en desarrollo
```bash
flutter run --dart-define=ENV=dev
```

### Run en producción
```bash
flutter run --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=https://tu-proyecto.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=tu_key_aqui
```

### Build APK producción
```bash
flutter build apk --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=https://tu-proyecto.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=tu_key_aqui
```

---

## 📁 Estructura Actual

```
zona_gol_mobile/
├── lib/
│   ├── core/                          ✅ COMPLETADO
│   │   ├── config/
│   │   │   ├── app_config.dart        ✅
│   │   │   └── theme.dart             ✅
│   │   ├── constants/
│   │   │   ├── app_constants.dart     ✅
│   │   │   └── storage_keys.dart      ✅
│   │   ├── errors/
│   │   │   ├── exceptions.dart        ✅
│   │   │   └── failures.dart          ✅
│   │   └── extensions/
│   │       ├── string_extensions.dart ✅
│   │       └── datetime_extensions.dart ✅
│   │
│   ├── data/                          🔨 SIGUIENTE FASE
│   │   ├── models/                    📝 Crear modelos con Freezed
│   │   ├── repositories/              📝 Implementaciones
│   │   └── datasources/               📝 Supabase + Hive
│   │
│   ├── domain/                        🔨 SIGUIENTE FASE
│   │   ├── entities/                  📝 Entidades de negocio
│   │   ├── repositories/              📝 Interfaces
│   │   └── usecases/                  📝 Casos de uso
│   │
│   └── presentation/                  ⏳ FUTURO
│       ├── blocs/                     📝 Estado con BLoC
│       ├── screens/                   📝 Pantallas
│       └── widgets/                   📝 Widgets
│
├── assets/                            📝 Agregar imágenes/iconos
├── pubspec.yaml                       ✅ Configurado
└── README.md                          📝 Por crear
```

---

## 🎯 Recomendaciones

### 1. Comenzar con Auth
El sistema de autenticación es la base de todo. Implementa primero:
1. Supabase client
2. Secure storage service
3. Auth BLoC
4. Login screen
5. Routing con guards

### 2. Reutilizar de Zona-G Existente
Puedes copiar y adaptar:
- Modelos: `Match`, `Player`, `Tournament`, `Team`
- Servicios: `auth_service.dart`, `match_service.dart`
- QR Scanner: Todo el código del scanner

### 3. Desarrollo Iterativo
No intentes implementar todo de una vez. Trabaja en sprints:
- **Sprint 1:** Auth + Navigation (1-2 semanas)
- **Sprint 2:** League Admin Dashboard básico (1-2 semanas)
- **Sprint 3:** CRUD de Torneos/Equipos (1-2 semanas)
- **Sprint 4:** QR Scanner + Attendance (1 semana)
- **Sprint 5:** Dashboards para otros roles (2 semanas)
- **Sprint 6:** Offline sync (2 semanas)

### 4. Testing
Agrega tests desde el inicio:
```bash
# Unit tests
test/unit/usecases/
test/unit/repositories/

# Widget tests
test/widget/screens/
test/widget/widgets/

# Integration tests
test/integration/
```

---

## 📚 Recursos

### Documentación
- [Flutter BLoC](https://bloclibrary.dev/)
- [Freezed](https://pub.dev/packages/freezed)
- [Go Router](https://pub.dev/packages/go_router)
- [Supabase Flutter](https://supabase.com/docs/reference/dart)
- [Hive](https://docs.hivedb.dev/)

### Arquitectura
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [BLoC Pattern](https://bloclibrary.dev/#/coreconcepts)

---

## 🤔 ¿Necesitas Ayuda?

### Preguntas Frecuentes

**Q: ¿Cómo genero el código de Freezed?**
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

**Q: ¿Cómo conecto con Supabase?**
Crea `lib/data/datasources/remote/supabase_client.dart`:
```dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/config/app_config.dart';

class SupabaseClient {
  static SupabaseClient? _instance;
  late final Supabase _supabase;

  SupabaseClient._();

  static Future<SupabaseClient> getInstance() async {
    if (_instance == null) {
      _instance = SupabaseClient._();
      await _instance!._init();
    }
    return _instance!;
  }

  Future<void> _init() async {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
    );
    _supabase = Supabase.instance;
  }

  SupabaseClient get client => _supabase.client;
}
```

**Q: ¿Cómo implemento login con Google?**
Ver documentación completa en `ZONA_GOL_MOBILE_ARCHITECTURE.md`

---

## 📞 Soporte

Si necesitas ayuda con alguna parte específica:
1. Revisa `ZONA_GOL_MOBILE_ARCHITECTURE.md` para entender la arquitectura
2. Mira el código existente en `Zona-G/` como referencia
3. Consulta la documentación de cada package

---

**Última actualización:** 2025-12-17
**Estado del proyecto:** Foundation Complete ✅
**Próximo milestone:** Data Models + Authentication 🎯
