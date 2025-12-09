# Sistema de Cierre de Sesión por Inactividad

## Descripción General

Se ha implementado un sistema de cierre automático de sesión después de **20 minutos de inactividad** para mejorar la seguridad de la aplicación.

## Características

### 1. **Detección de Inactividad**
- Monitorea la actividad del usuario en tiempo real
- Eventos detectados:
  - Movimiento del mouse
  - Clics
  - Teclas presionadas
  - Scroll
  - Touch (dispositivos móviles)

### 2. **Advertencia Previa**
- **2 minutos antes** del cierre automático, se muestra un toast de advertencia
- El usuario puede continuar su sesión simplemente interactuando con la página
- La advertencia desaparece automáticamente si hay actividad

### 3. **Cierre Automático**
- Después de **20 minutos** sin actividad, la sesión se cierra automáticamente
- El usuario es redirigido a la página de login
- Se muestra un mensaje explicando el motivo del cierre

## Archivos Implementados

### 1. `lib/hooks/use-idle-timeout.ts`
Hook personalizado que maneja toda la lógica de inactividad:

```typescript
useIdleTimeout({
  timeout: 20 * 60 * 1000,        // 20 minutos
  promptBeforeIdle: 2 * 60 * 1000, // Advertencia 2 min antes
})
```

**Funcionalidades:**
- Detecta eventos de actividad del usuario
- Gestiona timers de advertencia y cierre
- Muestra notificaciones toast
- Ejecuta el cierre de sesión automático

### 2. `lib/config/auth-config.ts`
Archivo de configuración centralizada:

```typescript
export const authConfig = {
  idleTimeout: 20 * 60 * 1000,      // 20 minutos
  idleWarningTime: 2 * 60 * 1000,   // 2 minutos
  activityEvents: [...],             // Eventos monitoreados
}
```

**Presets disponibles:**
- `strict`: 5 minutos (alta seguridad)
- `standard`: 20 minutos (configuración actual)
- `relaxed`: 60 minutos (menos restrictivo)
- `development`: 1 hora (solo para desarrollo)

### 3. `components/layout/dashboard-layout.tsx`
Implementación en el layout principal:

```typescript
import { useIdleTimeout } from "@/lib/hooks/use-idle-timeout"
import { authConfig } from "@/lib/config/auth-config"

// En el componente:
useIdleTimeout({
  timeout: authConfig.idleTimeout,
  promptBeforeIdle: authConfig.idleWarningTime,
})
```

## Configuración

### Cambiar el Tiempo de Inactividad

Edita el archivo `lib/config/auth-config.ts`:

```typescript
export const authConfig = {
  // Opción 1: Cambiar manualmente
  idleTimeout: 30 * 60 * 1000, // 30 minutos

  // Opción 2: Usar un preset
  ...authPresets.strict, // 5 minutos
  // ...authPresets.relaxed, // 60 minutos
}
```

### Desactivar Temporalmente (Solo Desarrollo)

En `dashboard-layout.tsx`, comenta la línea:

```typescript
// useIdleTimeout({...}) // Desactivado temporalmente
```

## Comportamiento

### Flujo Normal

1. Usuario inicia sesión → Timer comienza (20 min)
2. Usuario interactúa → Timer se resetea
3. 18 minutos sin actividad → Muestra advertencia
4. Usuario hace clic → Advertencia desaparece, timer se resetea
5. 20 minutos sin actividad → Cierre automático

### Casos Especiales

- **Usuario no autenticado**: El sistema no se activa
- **Múltiples tabs**: Cada tab tiene su propio timer
- **Navegación entre páginas**: El timer se mantiene activo
- **Minimizar ventana**: El timer continúa corriendo

## Notificaciones

### Advertencia (2 min antes)
```
⚠️ Tu sesión se cerrará en 2 minutos por inactividad. 
Haz clic en cualquier lugar para continuar.
```

### Cierre Automático
```
❌ Tu sesión ha sido cerrada por inactividad
```

## Seguridad

### Beneficios
- ✅ Previene acceso no autorizado en sesiones abandonadas
- ✅ Protege datos sensibles en dispositivos compartidos
- ✅ Cumple con mejores prácticas de seguridad
- ✅ Mejora el cumplimiento de políticas de seguridad

### Consideraciones
- El sistema solo funciona cuando hay una sesión activa
- No afecta a usuarios que mantienen actividad regular
- Los datos no guardados se perderán al cerrar sesión

## Testing

### Prueba Rápida (Desarrollo)

Cambia temporalmente el timeout en `auth-config.ts`:

```typescript
export const authConfig = {
  idleTimeout: 30 * 1000, // 30 segundos para pruebas
  idleWarningTime: 10 * 1000, // 10 segundos
}
```

**Pasos:**
1. Inicia sesión
2. No interactúes por 20 segundos
3. Deberías ver la advertencia
4. Espera 10 segundos más
5. La sesión debería cerrarse

**Recuerda:** Restaurar los valores originales después de probar.

## Mantenimiento

### Monitoreo de Logs

El sistema registra eventos en la consola:

```
🔴 Sesión cerrada por inactividad
```

### Ajustes Futuros

Si necesitas ajustar el comportamiento:

1. **Cambiar tiempo**: Edita `auth-config.ts`
2. **Cambiar eventos**: Modifica `activityEvents` en `auth-config.ts`
3. **Personalizar mensajes**: Edita los mensajes en `use-idle-timeout.ts`

## FAQ

**P: ¿El timer se resetea al cambiar de página?**  
R: Sí, cualquier interacción (incluyendo navegación) resetea el timer.

**P: ¿Qué pasa si estoy escribiendo algo?**  
R: Escribir (keypress) cuenta como actividad y resetea el timer.

**P: ¿Puedo tener diferentes timeouts para diferentes roles?**  
R: Sí, puedes modificar el hook para aceptar diferentes configuraciones según el rol del usuario.

**P: ¿Funciona en mobile?**  
R: Sí, detecta eventos touch y otras interacciones móviles.

---

**Fecha de implementación:** $(date +%Y-%m-%d)  
**Versión:** 1.0  
**Configuración actual:** 20 minutos de inactividad, 2 minutos de advertencia
