# Ensayo de jornada con dos ligas

Guía manual del ensayo previo al lanzamiento de enero de 2027 (issue #41). La siguen los responsables de las ligas, con quien opere el sistema a su lado. Recorre una jornada de fútbol completa en web y móvil y comprueba que una liga no puede ver ni tocar los datos privados de la otra. **Zona Play no forma parte del ensayo.**

La versión automática del mismo recorrido es `TestMatchdayRehearsalTwoLeagues` en `backend/cmd/api/matchday_integration_test.go`. Esta guía cubre lo que ese test no puede ver: las pantallas, la app móvil y el criterio de las personas.

## 1. Preparación (operador)

1. Levanta el sistema y carga los datos de ensayo:
   ```sh
   make up
   make seed
   ```
   `make seed` es idempotente: si la liga demo ya existe, solo agrega la que falte.
2. Abre la web en http://localhost:8088.
3. Para la app móvil, apúntala a la API: `flutter run --dart-define=API_BASE_URL=http://<IP-de-la-Mac>:8080` en un teléfono, o solo `flutter run` en el simulador de iOS. Ver `zona_gol_mobile/GETTING_STARTED.md`.

Todos los datos son ficticios. **No uses jugadores, teléfonos ni documentos reales en el ensayo.**

### Cuentas

Todas usan la contraseña `SEED_PASSWORD` de `deploy/.env`.

| Cuenta | Rol | Liga |
|---|---|---|
| `superadmin@zonagol.local` | Super admin | Todas |
| `liga@zonagol.local` | Admin de liga | **Liga A**: Liga Demo Zona Gol (`liga-demo`), 6 equipos |
| `equipo@zonagol.local` | Dueño de equipo | Liga A, equipo Águilas FC |
| `liga-b@zonagol.local` | Admin de liga | **Liga B**: Liga Ensayo B (`liga-ensayo-b`), 4 equipos |
| `equipo-b@zonagol.local` | Dueño de equipo | Liga B, equipo Pumas del Sur |

Cada liga trae un torneo con jornadas ya jugadas y **una jornada programada para hoy**, que es la que se usa para asistencia y resultados. Si el seed se cargó otro día, la jornada de "hoy" quedó en esa fecha: repite el seed en una base nueva (`make reset` borra los datos) o mueve un partido a hoy desde **Calendario**.

### Cómo registrar el resultado de cada paso

Anota en cada paso ✅ (salió lo esperado) o ❌ (no salió), con una nota y una captura cuando falle. Un ❌ en la sección 5 (aislamiento) bloquea el lanzamiento.

## 2. Armar torneo, equipos y jugadores (web, Liga B)

Entra como `liga-b@zonagol.local`.

| # | Paso | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 2.1 | **Torneos** → crea "Clausura Ensayo", formato liga, con fechas dentro de los próximos 3 meses. | El torneo aparece en la lista de la Liga B. | |
| 2.2 | **Equipos** → crea "Ensayo Norte" y "Ensayo Sur" en el torneo "Clausura Ensayo". | Ambos aparecen en la lista con el torneo correcto. | |
| 2.3 | Entra a cada equipo y agrega 3 jugadores con nombre, posición y número (por ejemplo 1, 9 y 10). | Cada equipo muestra sus 3 jugadores. Un número repetido en el mismo equipo se rechaza con un mensaje. | |
| 2.4 | Intenta crear un jugador sin nombre o con el número 0. | La web muestra el error junto al campo y no se crea nada. | |

## 3. Generar y publicar el fixture (web, Liga B)

| # | Paso | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 3.1 | **Jornadas** → torneo "Clausura Ensayo" → elige los dos equipos, el día de juego, la hora y una cancha → **vista previa**. | Se muestra el calendario propuesto sin guardarlo. | |
| 3.2 | Genera el fixture. | Aparecen los partidos en **Calendario**, todavía sin publicar. | |
| 3.3 | Publica la jornada 1. | Los partidos quedan publicados. | |
| 3.4 | Abre, sin sesión, el portal público `http://localhost:8088/liga/liga-ensayo-b`. | Se ve la jornada publicada del "Clausura Ensayo". Las jornadas sin publicar no aparecen. | |

## 4. Día de partido: asistencia, resultado y tabla

### 4.1 Asistencia con QR (app móvil, Liga A): validación móvil del issue

Entra en la app como `liga@zonagol.local`.

| # | Paso | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 4.1.1 | En el dashboard, **Jugadores** → abre un jugador de un equipo que juega hoy → **Credencial**. | Se muestra la credencial con su QR. | |
| 4.1.2 | Con un segundo teléfono, abre **Escáner QR** y escanea la credencial. *En el simulador, sin cámara:* en la credencial pulsa **COPIAR DATOS QR**; luego, en **Escáner QR**, usa la entrada manual, pega el texto y pulsa **PROCESAR QR**. | Aparecen el jugador y su partido de hoy. | |
| 4.1.3 | Confirma la asistencia. | Se registra y el jugador aparece como presente en la asistencia del partido. | |
| 4.1.4 | Escanea al mismo jugador otra vez. | La app avisa que ya tiene asistencia; no se duplica. | |
| 4.1.5 | Registra al menos 2 jugadores por equipo del mismo partido. | La lista de asistencia del partido muestra a todos. | |

Para dejar constancia de esta validación, guarda capturas de 4.1.2, 4.1.3 y 4.1.4 junto con el modelo del teléfono (o "simulador iPhone") y la versión de la app.

### 4.2 Resultado (móvil o web, Liga A)

| # | Paso | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 4.2.1 | Móvil: **Registrar Resultado** → elige el partido de hoy. Web: **Resultados**. | Se abre la captura del partido con sus dos equipos. | |
| 4.2.2 | Marcador 2-1. Primero agrega **tres** goles al local. | Móvil: aviso **GOLES NO COINCIDEN** y no deja avanzar hasta corregir. | |
| 4.2.3 | Corrige: dos goles del local (mismo jugador), uno del visitante y una tarjeta amarilla. | Avanza al paso de confirmación con el resumen correcto. | |
| 4.2.4 | **CONFIRMAR RESULTADO**. | El partido pasa a finalizado. Ya no se le puede registrar asistencia: la app avisa que el partido está cerrado. | |

### 4.3 Tabla y estadísticas públicas

| # | Paso | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 4.3.1 | Web, Liga A: **Posiciones**. | El ganador suma 3 puntos y un partido más; el perdedor suma un partido y ningún punto. Los goles a favor y en contra cuadran con el 2-1. | |
| 4.3.2 | **Goleadores**. | El jugador con dos goles aparece con 2 más de los que tenía. | |
| 4.3.3 | **Suspensiones**: si registraste una roja, la suspensión aparece aquí. | La sanción corresponde al jugador correcto. | |
| 4.3.4 | Sin sesión, abre `http://localhost:8088/liga/liga-demo`. | Resultado, tabla y goleadores coinciden con el panel. No se muestran datos privados: documentos, teléfonos ni asistencia. | |

## 5. Aislamiento entre ligas y restricciones por rol

Esta sección bloquea el lanzamiento: **cualquier ❌ detiene el go/no-go.**

| # | Paso | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 5.1 | Web como `liga@zonagol.local` (Liga A): revisa **Torneos**, **Equipos**, **Calendario** y **Verificación**. | Solo aparecen la Liga A y sus datos. Nada de "Liga Ensayo B". | |
| 5.2 | Copia de la Liga B la dirección de un equipo o de un torneo (por ejemplo, abriéndolo como `liga-b`) y ábrela con la sesión de la Liga A. | La web muestra "sin permiso" o "no encontrado" y no deja editar. | |
| 5.3 | App móvil como `liga@zonagol.local`: **Escáner QR** con los datos QR de un jugador de la Liga B (cópialos con la sesión de `liga-b`). | La asistencia no se registra; la app no ofrece partidos de la Liga B. | |
| 5.4 | Como `equipo@zonagol.local` (dueño en la Liga A): intenta ver o editar jugadores de otro equipo. | Solo puede gestionar su equipo, Águilas FC. | |
| 5.5 | Como `equipo-b@zonagol.local`: revisa que no ve nada de la Liga A. | Solo ve Pumas del Sur. | |
| 5.6 | Sin sesión, intenta abrir `http://localhost:8088/liga-admin`. | Redirige al inicio de sesión. | |
| 5.7 | Repite 5.1 a 5.3 al revés, con `liga-b@zonagol.local` contra la Liga A. | Mismo resultado: ni lee ni modifica la Liga A. | |

## 6. Cierre del ensayo

- [ ] Todas las filas tienen ✅/❌ y las ❌ tienen nota y captura.
- [ ] Ninguna ❌ en la sección 5.
- [ ] Validación móvil (4.1) documentada con capturas, dispositivo y versión.
- [ ] Los responsables de cada liga ejecutaron las secciones 2 a 4 sin ayuda del operador, o se anotó en qué necesitaron ayuda.
- [ ] Incidencias abiertas como issues en GitHub, con la etiqueta del paso (por ejemplo "Ensayo 4.2.4").

Para volver a empezar desde cero en un entorno local: `make reset` (borra todos los datos), `make up` y `make seed`.
