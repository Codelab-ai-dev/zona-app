# 🧪 Product Mode - Plan de Testing

## Objetivo
Verificar que el sistema de product_mode funciona correctamente en ambos modos (full y web_only).

---

## ✅ Test 1: Crear Liga en Modo FULL

### Pre-requisitos
- Usuario super_admin autenticado
- Acceso al dashboard de super admin

### Pasos
1. Ir a `/dashboard` (Super Admin)
2. Click en tab "Gestión de Ligas"
3. Click en "Nueva Liga"
4. Llenar formulario:
   - Nombre: "Liga Test Full"
   - Slug: "liga-test-full"
   - Descripción: "Liga de prueba modo completo"
   - Admin: Crear nuevo admin
   - **Producto: Seleccionar "🏆 Zona-G Completo"**
5. Click en "Crear Liga"

### Verificaciones Esperadas
- [x] Liga se crea exitosamente
- [x] Badge muestra "🏆 Completo"
- [x] En la BD: `product_mode = 'full'`
- [x] En la BD: `features` tiene todos los valores en `true`

### SQL para Verificar
```sql
SELECT id, name, product_mode, features
FROM leagues
WHERE slug = 'liga-test-full';
```

---

## ✅ Test 2: Crear Liga en Modo WEB ONLY

### Pre-requisitos
- Usuario super_admin autenticado
- Acceso al dashboard de super admin

### Pasos
1. Ir a `/dashboard` (Super Admin)
2. Click en tab "Gestión de Ligas"
3. Click en "Nueva Liga"
4. Llenar formulario:
   - Nombre: "Liga Test Web"
   - Slug: "liga-test-web"
   - Descripción: "Liga de prueba modo web"
   - Admin: Crear nuevo admin
   - **Producto: Seleccionar "🌐 Zona-G Web"**
5. Click en "Crear Liga"

### Verificaciones Esperadas
- [x] Liga se crea exitosamente
- [x] Badge muestra "🌐 Web"
- [x] En la BD: `product_mode = 'web_only'`
- [x] En la BD: `features.qr_codes = false`
- [x] En la BD: `features.facial_recognition = false`
- [x] En la BD: `features.mobile_app = false`

### SQL para Verificar
```sql
SELECT id, name, product_mode, features
FROM leagues
WHERE slug = 'liga-test-web';
```

---

## ✅ Test 3: Dashboard League Admin - Modo FULL

### Pre-requisitos
- Liga "Liga Test Full" creada
- Usuario league_admin de esa liga autenticado

### Pasos
1. Login como admin de "Liga Test Full"
2. Ir a `/dashboard`
3. Verificar tab "Resumen"

### Verificaciones Esperadas
- [x] Badge muestra "🏆 Zona-G Completo"
- [x] Badge muestra "$999 MXN/mes"
- [x] Tab "Gestión QR" está visible
- [x] No hay mensajes de upgrade

---

## ✅ Test 4: Dashboard League Admin - Modo WEB ONLY

### Pre-requisitos
- Liga "Liga Test Web" creada
- Usuario league_admin de esa liga autenticado

### Pasos
1. Login como admin de "Liga Test Web"
2. Ir a `/dashboard`
3. Verificar tab "Resumen"

### Verificaciones Esperadas
- [x] Badge muestra "🌐 Zona-G Web"
- [x] Badge muestra "$499 MXN/mes"
- [x] Tab "Gestión QR" está visible (pero mostrará mensaje de upgrade al intentar usar)

---

## ✅ Test 5: QR Batch Update - Modo FULL

### Pre-requisitos
- Liga "Liga Test Full" con al menos 1 equipo y 1 jugador
- Usuario league_admin autenticado

### Pasos
1. Ir a `/dashboard` → tab "Gestión QR"
2. Click en "Actualizar Todos los QR Codes"
3. Esperar a que termine el proceso

### Verificaciones Esperadas
- [x] Proceso inicia correctamente
- [x] Muestra progreso de jugadores procesados
- [x] Completa exitosamente
- [x] Mensaje: "✅ Todos los N códigos QR fueron actualizados exitosamente"

---

## ✅ Test 6: QR Batch Update - Modo WEB ONLY

### Pre-requisitos
- Liga "Liga Test Web" con al menos 1 equipo y 1 jugador
- Usuario league_admin autenticado

### Pasos
1. Ir a `/dashboard` → tab "Gestión QR"
2. Click en "Actualizar Todos los QR Codes"
3. Observar resultado

### Verificaciones Esperadas
- [x] Proceso inicia
- [x] Toast: "No hay ligas con modo Completo que soporten códigos QR"
- [x] Proceso termina sin procesar jugadores
- [x] No se generan QR codes

---

## ✅ Test 7: Player Management - Modo FULL

### Pre-requisitos
- Liga "Liga Test Full" con 1 equipo
- Usuario team_owner autenticado

### Pasos
1. Ir a `/dashboard` → tab "Jugadores"
2. Click en "Agregar Jugador"
3. Llenar datos del jugador
4. Click en "Guardar"
5. Verificar que aparece botón de QR en la card del jugador
6. Click en botón QR

### Verificaciones Esperadas
- [x] Jugador se crea exitosamente
- [x] Se genera QR automáticamente
- [x] Modal de QR se abre mostrando el código
- [x] Botón de QR (icono QrCode) es visible en la card
- [x] Click en botón QR genera nuevo QR

---

## ✅ Test 8: Player Management - Modo WEB ONLY

### Pre-requisitos
- Liga "Liga Test Web" con 1 equipo
- Usuario team_owner autenticado

### Pasos
1. Ir a `/dashboard` → tab "Jugadores"
2. Click en "Agregar Jugador"
3. Llenar datos del jugador
4. Click en "Guardar"
5. Verificar la card del jugador

### Verificaciones Esperadas
- [x] Jugador se crea exitosamente
- [x] NO se genera QR automáticamente
- [x] Botón de QR (icono QrCode) NO es visible
- [x] Solo aparecen botones de Editar, Activar/Desactivar, Eliminar

---

## ✅ Test 9: Attendance Monitor - Modo FULL

### Pre-requisitos
- Liga "Liga Test Full" con 1 partido
- Usuario league_admin autenticado

### Pasos
1. Ir a componente de Attendance Monitor (si está accesible)
2. O verificar en código que el componente carga correctamente

### Verificaciones Esperadas
- [x] Componente carga sin errores
- [x] Muestra interfaz de monitoreo
- [x] NO muestra mensaje de upgrade

---

## ✅ Test 10: Attendance Monitor - Modo WEB ONLY

### Pre-requisitos
- Liga "Liga Test Web" con 1 partido
- Usuario league_admin autenticado

### Pasos
1. Ir a componente de Attendance Monitor
2. Verificar mensaje

### Verificaciones Esperadas
- [x] Muestra Alert de upgrade
- [x] Mensaje: "El reconocimiento facial y monitoreo de asistencias requiere el plan Zona-G Completo"
- [x] Menciona plan actual: "Actualmente estás usando el plan Zona-G Web"

---

## ✅ Test 11: App Management - Modo FULL

### Pre-requisitos
- Liga "Liga Test Full"
- Usuario league_admin autenticado

### Pasos
1. Crear un componente/página que muestre AppManagement
2. Verificar que se puede acceder

### Verificaciones Esperadas
- [x] Componente carga correctamente
- [x] Muestra UI de gestión de APKs
- [x] Permite subir archivos APK

---

## ✅ Test 12: App Management - Modo WEB ONLY

### Pre-requisitos
- Liga "Liga Test Web"
- Usuario league_admin autenticado

### Pasos
1. Intentar acceder a AppManagement
2. Verificar mensaje

### Verificaciones Esperadas
- [x] Muestra Alert de upgrade
- [x] Mensaje: "Esta función requiere el plan Zona-G Completo"
- [x] NO muestra UI de gestión de APKs

---

## ✅ Test 13: RLS Policy - asistencias_qr (Modo WEB ONLY)

### Pre-requisitos
- Liga "Liga Test Web"
- Partido creado en esa liga
- Jugador en esa liga

### SQL Test
```sql
-- Intentar insertar asistencia QR en liga web_only
INSERT INTO asistencias_qr (
  player_id,
  match_id,
  scan_timestamp
)
VALUES (
  '[player_id_de_liga_web]',
  '[match_id_de_liga_web]',
  NOW()
);
```

### Verificaciones Esperadas
- [x] INSERT FALLA
- [x] Error de RLS policy
- [x] Mensaje indica que la operación no está permitida

---

## ✅ Test 14: RLS Policy - asistencias_qr (Modo FULL)

### Pre-requisitos
- Liga "Liga Test Full"
- Partido creado en esa liga
- Jugador en esa liga

### SQL Test
```sql
-- Insertar asistencia QR en liga full
INSERT INTO asistencias_qr (
  player_id,
  match_id,
  scan_timestamp
)
VALUES (
  '[player_id_de_liga_full]',
  '[match_id_de_liga_full]',
  NOW()
);
```

### Verificaciones Esperadas
- [x] INSERT EXITOSO
- [x] Registro se inserta correctamente

---

## ✅ Test 15: Cambio de Modo (Upgrade)

### Pre-requisitos
- Liga "Liga Test Web" existente
- Acceso a base de datos

### SQL para Cambiar Modo
```sql
UPDATE leagues
SET product_mode = 'full'
WHERE slug = 'liga-test-web';
```

### Verificaciones Esperadas
- [x] UPDATE exitoso
- [x] Trigger `trigger_set_default_features` se ejecuta
- [x] `features` se actualiza automáticamente con todos en `true`
- [x] `mode_updated_at` se actualiza

### Verificación Post-Cambio
1. Recargar dashboard como admin de la liga
2. Verificar badge ahora muestra "🏆 Completo"
3. Verificar que todas las funciones ahora están disponibles

---

## ✅ Test 16: Cambio de Modo (Downgrade)

### Pre-requisitos
- Liga "Liga Test Full" existente
- Acceso a base de datos

### SQL para Cambiar Modo
```sql
UPDATE leagues
SET product_mode = 'web_only'
WHERE slug = 'liga-test-full';
```

### Verificaciones Esperadas
- [x] UPDATE exitoso
- [x] Trigger se ejecuta
- [x] `features.qr_codes` cambia a `false`
- [x] `features.facial_recognition` cambia a `false`
- [x] `features.mobile_app` cambia a `false`

### Verificación Post-Cambio
1. Recargar dashboard como admin de la liga
2. Verificar badge ahora muestra "🌐 Web"
3. Verificar que funciones QR/Facial muestran mensajes de upgrade

---

## 📊 Resumen de Tests

| # | Test | Tipo | Prioridad |
|---|------|------|-----------|
| 1 | Crear Liga Full | Funcional | Alta |
| 2 | Crear Liga Web | Funcional | Alta |
| 3 | Dashboard Full | UI | Alta |
| 4 | Dashboard Web | UI | Alta |
| 5 | QR Batch Full | Funcional | Alta |
| 6 | QR Batch Web | Funcional | Alta |
| 7 | Player Mgmt Full | Funcional | Alta |
| 8 | Player Mgmt Web | Funcional | Alta |
| 9 | Attendance Full | Funcional | Media |
| 10 | Attendance Web | Funcional | Media |
| 11 | App Mgmt Full | Funcional | Media |
| 12 | App Mgmt Web | Funcional | Media |
| 13 | RLS Web Block | Seguridad | Alta |
| 14 | RLS Full Allow | Seguridad | Alta |
| 15 | Upgrade | Funcional | Media |
| 16 | Downgrade | Funcional | Media |

---

## 🎯 Criterios de Éxito

Para considerar la implementación completa:

- ✅ Todos los tests de prioridad ALTA pasan
- ✅ Al menos 80% de tests de prioridad MEDIA pasan
- ✅ No hay errores en consola
- ✅ No hay loops infinitos o pantallas cargando indefinidamente
- ✅ RLS policies funcionan correctamente
- ✅ UX es clara y consistente

---

## 🐛 Reporte de Bugs

Documentar aquí cualquier bug encontrado durante testing:

### Bug Template
```
**Bug ID:** #001
**Severidad:** Alta/Media/Baja
**Componente:** [nombre del componente]
**Descripción:** [descripción del bug]
**Pasos para reproducir:**
1. ...
2. ...
**Resultado esperado:** ...
**Resultado actual:** ...
**Fix propuesto:** ...
```

---

## ✅ Estado de Testing

- [ ] Test 1 - Crear Liga Full
- [ ] Test 2 - Crear Liga Web
- [ ] Test 3 - Dashboard Full
- [ ] Test 4 - Dashboard Web
- [ ] Test 5 - QR Batch Full
- [ ] Test 6 - QR Batch Web
- [ ] Test 7 - Player Mgmt Full
- [ ] Test 8 - Player Mgmt Web
- [ ] Test 9 - Attendance Full
- [ ] Test 10 - Attendance Web
- [ ] Test 11 - App Mgmt Full
- [ ] Test 12 - App Mgmt Web
- [ ] Test 13 - RLS Web Block
- [ ] Test 14 - RLS Full Allow
- [ ] Test 15 - Upgrade
- [ ] Test 16 - Downgrade

**Progreso:** 0/16 tests completados
