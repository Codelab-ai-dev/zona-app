# 🚀 Guía Rápida - Zona Gol Mobile

## ¿Cómo ejecutar la app?

### Opción 1: Forma más simple (Recomendada)

```bash
cd zona_gol_mobile
flutter run
```

Eso es todo! Las credenciales de Supabase ya están configuradas en el código.

### Opción 2: Con script

```bash
cd zona_gol_mobile
./run_dev.sh "iPhone 17"
```

### Opción 3: Ver dispositivos disponibles y elegir uno

```bash
# Ver dispositivos disponibles
flutter devices

# Ejecutar en un dispositivo específico
flutter run -d "iPhone 17"
flutter run -d chrome
flutter run -d emulator-5554
```

## 📱 Credenciales de Prueba

Consulta con el administrador del sistema para obtener credenciales de prueba.

El usuario que probé es:
- Email: `hggonzalezb84@gmail.com`
- Rol: `super_admin`

## ✅ Estado del Login

El login con email y password ya está funcionando correctamente. ✨

### Lo que se implementó:

1. ✅ **Autenticación con Supabase**
   - Login con email/password
   - Logout
   - Verificación de sesión
   - Persistencia de sesión

2. ✅ **Clean Architecture**
   - Domain layer (entities, repositories, use cases)
   - Data layer (repositories, mappers, data sources)
   - Presentation layer (BLoC, screens)

3. ✅ **BLoC Pattern**
   - AuthBloc para manejo de estado
   - Eventos y estados de autenticación
   - Navegación basada en estado

4. ✅ **Caché Local**
   - Hive para datos del usuario
   - Secure Storage para tokens
   - Modo offline preparado

## 🐛 Problemas Comunes

### "No host specified in URI"

**Causa:** No se están pasando las credenciales de Supabase.

**Solución:** Ya está solucionado! Las credenciales están configuradas por defecto en `lib/core/config/app_config.dart`

### "Box user_profile not found"

**Causa:** Advertencia al limpiar caché que no existe.

**Solución:** Ya está solucionado! Ahora se maneja silenciosamente.

### "Invalid credentials"

**Causa:** Email o contraseña incorrectos.

**Solución:** Verifica tus credenciales con el administrador del sistema.

## 🔧 Configuración

### Cambiar las credenciales de Supabase

Si necesitas conectarte a otro servidor de Supabase, edita el archivo:

```
lib/core/config/app_config.dart
```

Y cambia los valores por defecto:

```dart
static const String supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'TU_URL_AQUI',
);

static const String supabaseAnonKey = String.fromEnvironment(
  'SUPABASE_ANON_KEY',
  defaultValue: 'TU_KEY_AQUI',
);
```

O pasa las variables al ejecutar:

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://tu-servidor.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=tu_key_aqui
```

## 📝 Próximos Pasos

1. **Implementar más pantallas**
   - Dashboard para cada rol
   - Lista de ligas
   - Lista de equipos
   - Gestión de jugadores

2. **Funcionalidades pendientes**
   - Registro de nuevos usuarios
   - Recuperación de contraseña
   - Login con Google (UI ya existe, solo falta conectar)
   - Login con Apple (UI ya existe, solo falta conectar)

3. **Modo Offline**
   - Sincronización automática
   - Cola de operaciones pendientes
   - Manejo de conflictos

## 💡 Tips

- Usa `r` en la consola para hot reload mientras desarrollas
- Usa `R` para hot restart
- Los logs tienen emojis para facilitar el debugging:
  - 🔐 Autenticación
  - 📡 Red
  - 💾 Caché
  - ✅ Éxito
  - ❌ Error

## 📚 Documentación Adicional

- **README.md** - Documentación completa del proyecto
- **GETTING_STARTED.md** - Guía de inicio detallada
- **ZONA_GOL_MOBILE_ARCHITECTURE.md** - Arquitectura del proyecto

---

**¿Necesitas ayuda?** Revisa los logs en la consola cuando ejecutes la app. Los mensajes son muy descriptivos y te dirán exactamente qué está pasando.
