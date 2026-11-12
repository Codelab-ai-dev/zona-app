# 🚀 Guía Rápida - Zona Gol Mobile

## ¿Cómo ejecutar la app?

### Antes: levanta el backend

```bash
cd backend
make db-up   # Postgres local en Docker (puerto 55432)
make run     # API en http://localhost:8080
```

### Opción 1: Forma más simple (Recomendada)

```bash
cd zona_gol_mobile
flutter run
```

En el simulador de iOS la app llega a la API en `http://localhost:8080` sin configurar nada.

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

1. ✅ **Autenticación con la API Zona Gol**
   - Login con email/password
   - Logout (revoca el refresh token)
   - Renovación automática del access token
   - Persistencia de sesión en Secure Storage

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

### "Connection refused" / la app no carga datos

**Causa:** La app no llega a la API.

**Solución:** Verifica que el backend esté corriendo (`make run` en `backend/`) y que `API_BASE_URL` apunte al Mac: `localhost` en el simulador de iOS, `10.0.2.2` en el emulador de Android, o la IP local del Mac en un teléfono físico.

### "Tu sesión expiró"

**Causa:** El refresh token fue rechazado (expiró o se revocó).

**Solución:** Vuelve a iniciar sesión.

### "Box user_profile not found"

**Causa:** Advertencia al limpiar caché que no existe.

**Solución:** Ya está solucionado! Ahora se maneja silenciosamente.

### "Invalid credentials"

**Causa:** Email o contraseña incorrectos.

**Solución:** Verifica tus credenciales con el administrador del sistema.

## 🔧 Configuración

### Cambiar el servidor de la API

La URL se define en `lib/core/config/app_config.dart` (`API_BASE_URL`, por defecto `http://localhost:8080`). Para cambiarla, pásala al ejecutar:

```bash
# Emulador Android
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080

# Teléfono físico en la misma red
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:8080

# Producción (debe ser https)
flutter run --release --dart-define=ENV=prod --dart-define=API_BASE_URL=https://api.tu-dominio.com
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

---

**¿Necesitas ayuda?** Revisa los logs en la consola cuando ejecutes la app. Los mensajes son muy descriptivos y te dirán exactamente qué está pasando.
