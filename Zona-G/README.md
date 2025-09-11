# Zona Gol - Flutter App

Una aplicación Flutter para la gestión de jugadores de fútbol con funcionalidades de escaneo QR y subida de fotos simplificada.

## Características

- ✅ **Escaneo de códigos QR**: Escanea códigos QR de jugadores para verificar identidades
- ✅ **Subida de fotos simple**: Toma fotos de jugadores y las guarda directamente en la base de datos (sin procesamiento facial)
- ✅ **Lista de jugadores**: Ve todos los jugadores registrados con búsqueda
- ✅ **Detalles de jugador**: Ve información completa de cada jugador
- ✅ **Integración con Supabase**: Conecta con el backend del proyecto web

## Requisitos

- Flutter SDK (versión 3.8.1 o superior)
- Dart SDK
- Android Studio / Xcode para desarrollo móvil
- Cuenta de Supabase configurada

## Instalación

1. **Clonar e instalar dependencias**:
```bash
cd zona_app_flutter
flutter pub get
```

2. **Configurar Supabase**:
   - Editar `lib/config/supabase_config.dart`
   - Reemplazar `supabaseUrl` y `supabaseAnonKey` con los valores de tu proyecto

3. **Ejecutar la aplicación**:
```bash
flutter run
```

## Estructura del Proyecto

```
lib/
├── config/
│   └── supabase_config.dart     # Configuración de Supabase
├── models/
│   ├── player.dart              # Modelo de jugador
│   └── qr_data.dart            # Modelo de datos QR
├── services/
│   ├── api_service.dart         # Servicios de API
│   ├── photo_service.dart       # Servicios de foto
│   └── qr_service.dart         # Servicios de QR
├── screens/
│   ├── home_screen.dart         # Pantalla principal
│   ├── qr_scanner_screen.dart   # Pantalla de escaneo QR
│   ├── player_detail_screen.dart # Detalles de jugador
│   └── player_list_screen.dart  # Lista de jugadores
└── main.dart                    # Punto de entrada
```

## Funcionalidades

### 📱 Pantalla Principal
- Navegación principal con botones para escanear QR y ver lista de jugadores
- Diseño limpio y fácil de usar

### 🔍 Escaneo QR
- Scanner de códigos QR en tiempo real
- Soporte para formatos JSON y legacy
- Navegación automática a detalles del jugador

### 📸 Subida de Fotos
- Tomar fotos con la cámara
- Seleccionar fotos de la galería
- Subida directa a Supabase Storage
- **Sin procesamiento de reconocimiento facial**

### 👥 Lista de Jugadores
- Ver todos los jugadores registrados
- Búsqueda por nombre, posición o número
- Información rápida (foto, nombre, posición, estado)

### 👤 Detalles de Jugador
- Información completa del jugador
- Posibilidad de actualizar foto
- Estado activo/inactivo
- Cálculo automático de edad

## Permisos

### Android
- `CAMERA`: Para tomar fotos
- `READ_EXTERNAL_STORAGE`: Para acceder a la galería
- `INTERNET`: Para conectar con Supabase

### iOS
- `NSCameraUsageDescription`: Acceso a cámara
- `NSPhotoLibraryUsageDescription`: Acceso a galería de fotos

## Dependencias Principales

- `qr_code_scanner`: Escaneo de códigos QR
- `image_picker`: Selección de imágenes
- `camera`: Acceso a cámara
- `supabase_flutter`: Cliente de Supabase
- `http`: Peticiones HTTP
- `permission_handler`: Manejo de permisos

## Configuración de Supabase

1. Crear un proyecto en [Supabase](https://supabase.com)
2. Configurar las tablas necesarias (players, teams, etc.)
3. Configurar Storage bucket para fotos de jugadores
4. Obtener URL del proyecto y clave anónima
5. Actualizar `lib/config/supabase_config.dart`

## Notas de Desarrollo

- ✅ **Sin reconocimiento facial**: Esta versión NO incluye procesamiento de reconocimiento facial
- ✅ **Fotos simples**: Las fotos se suben directamente sin procesamiento adicional
- ✅ **QR funcional**: Soporte completo para escaneo de códigos QR de jugadores
- ✅ **Integración completa**: Funciona con el backend del proyecto web zona-gol

## Migración desde la versión anterior

Esta app reemplaza la versión anterior que incluía reconocimiento facial. Los cambios principales:

1. **Eliminado**: Todas las funciones de reconocimiento facial y embeddings
2. **Simplificado**: Subida de fotos directa sin procesamiento
3. **Mantenido**: Todas las funcionalidades QR y gestión básica de jugadores

## Compilación

### Android
```bash
flutter build apk
```

### iOS
```bash
flutter build ios
```
