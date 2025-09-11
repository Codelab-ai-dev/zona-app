# Guía de Integración Flutter + Web App

## Resumen de la Integración

La integración entre la app Flutter y la aplicación web de Next.js está diseñada para que:

- **Flutter App**: Maneja todo el reconocimiento facial y captura de imágenes
- **Web App**: Gestiona la base de datos, generar códigos QR para selección de partidos, y monitorea asistencias en tiempo real
- **Supabase**: Actúa como backend compartido para sincronización de datos

## Flujo de Trabajo

### 1. Preparación del Partido (Web App)
1. Los administradores de liga crean partidos en el dashboard web
2. En la sección "Asistencias", se generan códigos QR únicos para cada partido
3. Los códigos QR contienen información del partido en formato JSON

### 2. Selección del Partido (Flutter App)
1. Abrir la app Flutter en el dispositivo móvil/tablet
2. Usar la función de escaneo QR para seleccionar el partido
3. La app decodifica el QR y carga la información del partido y jugadores

### 3. Reconocimiento Facial (Flutter App)
1. La app utiliza la cámara del dispositivo para capturar fotos
2. Procesa las imágenes usando ML Kit y TensorFlow Lite
3. Compara los embeddings faciales con los almacenados en Supabase
4. Registra automáticamente la asistencia del jugador reconocido

### 4. Monitoreo en Tiempo Real (Web App)
1. La web app muestra asistencias en tiempo real usando subscripciones de Supabase
2. Los administradores pueden ver estadísticas de confianza y modo de verificación
3. Los datos se sincronizan automáticamente entre dispositivos

## Componentes Creados

### Web App Components

1. **AttendanceMonitor** (`/components/attendance/attendance-monitor.tsx`)
   - Monitoreo en tiempo real de asistencias
   - Subscripciones a cambios en la base de datos
   - Visualización de confianza y estadísticas

2. **MatchQRGenerator** (`/components/match/match-qr-generator.tsx`)
   - Generación de códigos QR para partidos
   - Descarga de códigos QR en formato SVG
   - Información detallada del partido en el QR

3. **Dashboard Integration** (actualizado `app/dashboard/page.tsx`)
   - Nueva sección "Asistencias" en el dashboard de administradores
   - Integración de componentes de monitoreo y QR

### Flutter App (existente)
- **FaceRecognitionService**: Manejo de ML Kit y reconocimiento facial
- **ZonaGolApiService**: Comunicación con Supabase
- **QRService**: Escaneo de códigos QR (se debe implementar la decodificación del nuevo formato)

## Formato del Código QR

Los códigos QR generados por la web app contienen:

```json
{
  "type": "zona_gol_match",
  "version": "1.0",
  "match_id": "uuid-del-partido",
  "match_info": {
    "home_team": "Equipo Local",
    "away_team": "Equipo Visitante", 
    "date": "2025-08-31",
    "time": "18:00:00",
    "tournament": "Torneo de Verano",
    "league_slug": "liga-slug"
  },
  "timestamp": "2025-08-31T14:30:00.000Z"
}
```

## Base de Datos

### Tablas Principales

1. **partidos** - Información de partidos
2. **jugadores** - Jugadores con fotos y embeddings faciales
3. **equipos** - Equipos y sus jugadores
4. **asistencias_facial** - Registros de asistencia con reconocimiento facial

### Campos Importantes

- `face_embedding`: Vector de características faciales
- `confidence_score`: Nivel de confianza del reconocimiento
- `similarity_score`: Puntuación de similitud facial
- `recognition_mode`: "quick" o "verified"
- `sync_status`: Estado de sincronización

## Configuración Requerida

### Variables de Entorno

**Web App** (.env.local):
```
NEXT_PUBLIC_SUPABASE_URL=tu-url-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

**Flutter App** (.env):
```
SUPABASE_URL=tu-url-supabase
SUPABASE_ANON_KEY=tu-anon-key
```

## Funcionalidades Implementadas

✅ **Completado**:
- Dashboard de monitoreo de asistencias en tiempo real
- Generación y descarga de códigos QR para partidos
- Integración con el dashboard existente
- Componentes de UI responsivos
- Subscripciones en tiempo real con Supabase
- Estructura de datos compatible entre apps

## Próximos Pasos Recomendados

1. **Actualizar Flutter App**:
   - Modificar `QRService` para decodificar el nuevo formato JSON
   - Actualizar `MatchSelectorScreen` para usar la nueva estructura

2. **Testing**:
   - Probar el flujo completo de generación QR → escaneo → reconocimiento
   - Verificar sincronización en tiempo real

3. **Optimizaciones**:
   - Agregar filtros por fecha/equipo en el monitor
   - Implementar exportación de reportes
   - Mejorar UX con loading states

## Uso de la Integración

### Para Administradores de Liga:
1. Ir a Dashboard → Asistencias
2. Ver asistencias en tiempo real
3. Generar códigos QR para los partidos programados
4. Descargar e imprimir QR codes para el personal de campo

### Para Operadores de Campo:
1. Abrir app Flutter en tablet/móvil
2. Escanear QR del partido
3. Usar reconocimiento facial para registrar jugadores
4. Ver confirmación en tiempo real

La integración mantiene ambas apps funcionando independientemente mientras permite sincronización perfecta de datos.