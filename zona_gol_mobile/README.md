# Zona Gol Mobile 📱⚽

> Aplicación móvil completa para gestión de ligas de fútbol. Combina toda la funcionalidad administrativa de zona-gol web con las capacidades de campo de Zona-G.

## 🎯 Características Principales

### Roles Soportados
- **Super Admin** - Gestión de múltiples ligas y configuración del sistema
- **League Admin** - Administración completa de torneos, equipos, fixtures y resultados
- **Team Owner** - Gestión de jugadores y visualización de estadísticas de equipo
- **Usuario Público** - Acceso de solo lectura a tablas, partidos y estadísticas

### Funcionalidades Core
- ✅ Autenticación multi-provider (Email, Google, Apple)
- ✅ Gestión de ligas y torneos
- ✅ Gestión de equipos y jugadores
- ✅ Generación automática de fixtures (Round-Robin)
- ✅ Registro de asistencia con QR
- ✅ Entrada de resultados de partidos
- ✅ Tablas de posiciones en tiempo real
- ✅ Sistema de suspensiones automáticas
- ✅ Estadísticas detalladas
- ✅ Modo offline completo con sincronización

## 🏗️ Arquitectura

```
Clean Architecture + BLoC Pattern

┌─────────────────────────────────────┐
│      Presentation Layer (BLoC)      │
│  Screens │ Widgets │ BLoCs          │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│        Domain Layer                 │
│  Entities │ Use Cases │ Interfaces  │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│         Data Layer                  │
│  Models │ Repositories │ DataSources│
│  (Supabase + Hive + Secure Storage) │
└─────────────────────────────────────┘
```

## 📦 Stack Tecnológico

### Core
- **Flutter** ^3.10.0
- **Dart** ^3.10.0

### State Management
- **flutter_bloc** ^8.1.6
- **equatable** ^2.0.7

### Backend & Storage
- **supabase_flutter** ^2.8.0
- **hive** ^2.2.3
- **flutter_secure_storage** ^9.2.2

### Auth
- **google_sign_in** ^6.2.2
- **sign_in_with_apple** ^6.1.3

### UI/UX
- **go_router** ^14.6.2
- **cached_network_image** ^3.4.1
- **shimmer** ^3.0.0
- **fl_chart** ^0.70.1

### Utilities
- **freezed** ^2.5.2
- **json_serializable** ^6.8.0
- **injectable** ^2.5.0

## 🚀 Quick Start

### Prerequisitos
- Flutter SDK ^3.10.0
- Dart SDK ^3.10.0
- Cuenta de Supabase configurada
- Xcode (para iOS)
- Android Studio (para Android)

### Instalación

1. **Instalar dependencias**
```bash
flutter pub get
```

2. **Generar código (Freezed + JSON Serializable)**
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

3. **Ejecutar en modo desarrollo**

**Opción 1: Con credenciales ya configuradas (recomendado para desarrollo local)**
```bash
# Las credenciales de desarrollo ya están configuradas en app_config.dart
flutter run

# O usando el script:
./run_dev.sh "iPhone 17"
```

**Opción 2: Con variables de entorno personalizadas**
```bash
flutter run \
  --dart-define=ENV=dev \
  --dart-define=SUPABASE_URL=https://tu-proyecto.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=tu_key_aqui
```

> **Nota:** Las credenciales de desarrollo están configuradas como valores por defecto en `lib/core/config/app_config.dart`. Para producción, siempre pasa las variables con `--dart-define`.

### Build para Producción

**Android APK:**
```bash
flutter build apk --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=https://tu-proyecto.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=tu_key_aqui
```

**iOS:**
```bash
flutter build ios --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=https://tu-proyecto.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=tu_key_aqui
```

## 📂 Estructura del Proyecto

```
lib/
├── core/                    # Configuración y utilidades core ✅
│   ├── config/             # App config, theme
│   ├── constants/          # Constantes de la app
│   ├── errors/             # Excepciones y failures
│   ├── extensions/         # Extensiones de Dart
│   ├── network/            # Network utilities
│   └── utils/              # Helpers y validadores
│
├── data/                   # Capa de datos 🔨
│   ├── models/            # Modelos de datos (Freezed)
│   ├── repositories/      # Implementaciones de repositorios
│   └── datasources/       # Fuentes de datos
│       ├── remote/        # Supabase API
│       └── local/         # Hive + Secure Storage
│
├── domain/                # Capa de dominio ⏳
│   ├── entities/         # Entidades de negocio
│   ├── repositories/     # Interfaces de repositorios
│   └── usecases/         # Casos de uso
│
└── presentation/          # Capa de presentación ⏳
    ├── blocs/            # BLoC state management
    ├── screens/          # Pantallas de la app
    └── widgets/          # Widgets reutilizables
```

## 🔐 Seguridad

- ✅ Tokens en Flutter Secure Storage (Keychain/Keystore)
- ✅ SSL/TLS para todas las comunicaciones
- ✅ Row Level Security (RLS) en Supabase
- ✅ Validación de inputs
- ✅ No credentials hardcoded (use --dart-define)
- ✅ Diferentes configs por ambiente (dev/staging/prod)

## 🌐 Modo Offline

### Estrategia Offline-First
- **Caché local:** Hive para almacenamiento estructurado
- **Sync Queue:** Cola de operaciones pendientes
- **Conflict Resolution:** Estrategia last-write-wins
- **Auto-sync:** Sincronización automática al reconectar

### TTL (Time To Live)
- **Sesión:** 48 horas
- **Ligas:** 24 horas
- **Partidos:** 6 horas
- **Estadísticas:** 1 hora

## 📱 Soporte de Plataformas

| Plataforma | Min Version | Target Version | Estado |
|------------|------------|----------------|---------|
| **Android** | API 21 (5.0) | API 34 (14) | ✅ Soportado |
| **iOS** | iOS 12.0 | iOS 17.0 | ✅ Soportado |

## 📈 Roadmap

### ✅ Fase 1: Foundation (Completado)
- [x] Estructura del proyecto
- [x] Configuración de dependencias
- [x] Core utilities
- [x] Tema y constantes

### 🔨 Fase 2: Data & Auth (Siguiente)
- [ ] Modelos de datos con Freezed
- [ ] Supabase client
- [ ] Auth service
- [ ] Secure storage
- [ ] Hive setup

### ⏳ Fase 3: Navigation & Screens
- [ ] Go Router configuration
- [ ] Auth screens
- [ ] Dashboards por rol

### ⏳ Fase 4: Core Features
- [ ] League Admin features
- [ ] QR Scanner
- [ ] Offline sync

## 📚 Documentación

- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Guía de inicio y próximos pasos
- **[ZONA_GOL_MOBILE_ARCHITECTURE.md](ZONA_GOL_MOBILE_ARCHITECTURE.md)** - Arquitectura completa

## 🛠️ Comandos Útiles

```bash
# Limpiar proyecto
flutter clean

# Get dependencies
flutter pub get

# Generar código
flutter pub run build_runner build --delete-conflicting-outputs

# Analizar código
flutter analyze

# Formatear código
dart format lib/

# Testing
flutter test
```

---

**Version:** 1.0.0+1
**Last Updated:** 2025-12-17
**Status:** Foundation Complete ✅

**Para comenzar a desarrollar, ve a [GETTING_STARTED.md](GETTING_STARTED.md)**
