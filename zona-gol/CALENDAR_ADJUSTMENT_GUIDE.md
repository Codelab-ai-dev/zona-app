# Guía de Ajuste de Calendario

## Descripción

Esta funcionalidad permite ajustar automáticamente el calendario de partidos cuando equipos abandonan la liga o no están aprobados. Es especialmente útil para ligas amateurs donde los equipos pueden salir durante la temporada.

## Ubicación

**Dashboard → Admin Liga → Calendario → Botón "Ajustar Calendario"**

## ¿Cómo funciona?

### 1. Detección de Equipos Activos/Inactivos

Un equipo se considera **ACTIVO** si cumple AMBAS condiciones:
- ✅ Está aprobado en el sistema (`is_active = true`)
- ✅ Ha jugado al menos un partido O tiene partidos programados

Un equipo se considera **INACTIVO** si:
- ❌ No está aprobado (estado "Pendiente")
- ❌ Está desactivado en el sistema
- ❌ No tiene partidos asignados

### 2. Análisis del Calendario

Al hacer clic en "Ajustar Calendario", el sistema:

1. Obtiene todos los equipos de la liga (activos e inactivos)
2. Obtiene todos los partidos del torneo seleccionado
3. Analiza cada equipo para determinar su estado
4. Muestra un diálogo con:
   - Lista de equipos activos
   - Lista de equipos inactivos con el motivo
   - Número de partidos jugados vs programados por equipo
   - Advertencia si hay número impar de equipos

### 3. Regeneración del Calendario

Cuando se confirma el ajuste:

1. **Identifica** la última jornada con partidos finalizados
2. **Elimina** todos los partidos con estado `scheduled` (programados)
3. **Mantiene** todos los partidos con estado `finished` (finalizados)
4. **Genera** un nuevo calendario round-robin solo con equipos activos
5. **Numera** las nuevas jornadas empezando DESPUÉS de las finalizadas
6. **Maneja automáticamente** equipos impares con sistema de descanso rotatorio

#### Ejemplo:
Si las jornadas 1 y 2 están finalizadas:
- ✅ Jornadas 1-2: Se mantienen intactas
- ❌ Jornadas 3+: Se eliminan partidos programados
- ✨ Jornadas 3+: Se regeneran con equipos activos

**NO se mezclan** partidos finalizados con programados en la misma jornada.

## Manejo de Equipos Impares

Si hay un número impar de equipos activos (ej: 5 equipos):
- Un equipo diferente descansará en cada jornada
- El sistema usa el algoritmo de rotación circular
- Se genera automáticamente sin intervención manual

### Ejemplo con 5 equipos:

**Jornada 1:**
- Equipo A vs Equipo B
- Equipo C vs Equipo D
- *Equipo E descansa*

**Jornada 2:**
- Equipo E vs Equipo A
- Equipo B vs Equipo C
- *Equipo D descansa*

Y así sucesivamente...

## Manejo de Equipos Pares

Si hay un número par de equipos activos (ej: 6 equipos):
- Todos juegan en cada jornada
- Se generan 3 partidos por jornada
- Calendario balanceado automáticamente

## Motivos de Inactividad

El sistema muestra el motivo específico por el cual un equipo está inactivo:

1. **"Equipo no aprobado o desactivado"**
   - El equipo tiene estado "Pendiente"
   - El equipo fue desactivado manualmente

2. **"Sin partidos asignados"**
   - El equipo está aprobado pero no tiene partidos

## Configuración del Nuevo Calendario

### **🔍 Detección Automática de Configuración**

El sistema analiza **automáticamente** los partidos existentes para mantener la misma configuración:

#### **1. Días de juego:**
- Se detectan analizando las fechas de los partidos existentes
- Ejemplos:
  - Si los partidos son solo domingos → Nuevos partidos en domingo
  - Si son viernes y sábados → Nuevos partidos en viernes y sábados
  - Si son toda la semana → Se mantiene el patrón detectado

#### **2. Horarios:**
- Se detecta la hora más temprana de los partidos existentes
- Se calcula la duración promedio entre partidos
- Se generan horarios automáticamente basándose en el patrón detectado

#### **3. Canchas:**
- Se detecta el número máximo de canchas utilizadas

#### **4. Fecha de inicio:**
- Si hay jornadas finalizadas: El próximo día de juego después de la última jornada
- Si NO hay jornadas finalizadas: El próximo día de juego desde hoy

### **Configuración por Defecto** (si no hay partidos existentes)

Solo se usa cuando NO hay partidos existentes para analizar:

- **Día de juego:** Domingos
- **Duración del partido:** 75 minutos total
  - 1er tiempo: 30 minutos
  - Descanso: 15 minutos
  - 2do tiempo: 30 minutos
- **Hora de inicio:** 8:00 AM
- **Canchas:** 2 simultáneas

### **Ejemplos de Detección Automática:**

#### **Ejemplo 1: Liga de Domingos**
```
Partidos existentes:
- Domingo 8 Dic - 08:00, 09:15, 10:30
- Domingo 15 Dic - 08:00, 09:15, 10:30

Configuración detectada:
✓ Días: Domingos
✓ Hora inicio: 08:00
✓ Duración: 75 minutos
✓ Próxima jornada: Domingo 22 Dic
```

#### **Ejemplo 2: Liga de Viernes y Sábados**
```
Partidos existentes:
- Viernes 6 Dic - 19:00, 20:30, 22:00
- Sábado 7 Dic - 15:00, 16:30, 18:00

Configuración detectada:
✓ Días: Viernes y Sábados
✓ Hora inicio: 15:00 (más temprana)
✓ Duración: 90 minutos
✓ Próxima jornada: Viernes 13 Dic
```

#### **Ejemplo 3: Liga toda la semana**
```
Partidos existentes:
- Lunes, Martes, Miércoles, Jueves - 18:00, 19:00, 20:00

Configuración detectada:
✓ Días: Lunes a Jueves
✓ Hora inicio: 18:00
✓ Duración: 60 minutos
✓ Próxima jornada: Lunes siguiente
```

> **💡 Ventaja:** El sistema se adapta automáticamente a CUALQUIER configuración de liga existente

## Advertencias Importantes

⚠️ **Esta acción NO se puede deshacer**

- Elimina todos los partidos programados
- Genera un calendario completamente nuevo
- Los partidos finalizados se mantienen intactos

⚠️ **Antes de ajustar:**

- Verifica que los equipos correctos estén aprobados
- Confirma que los equipos inactivos realmente abandonaron
- Revisa el análisis detallado en el diálogo

## Casos de Uso

### Caso 1: Equipo abandona a mitad de temporada

**Situación:** Real Madrid abandonó la liga después de 3 jornadas

**Acción:**
1. Desactivar el equipo Real Madrid (cambiar a "Pendiente" o desactivar)
2. Ir a Calendario → Ajustar Calendario
3. Verificar que Real Madrid aparezca como inactivo
4. Confirmar regeneración
5. El nuevo calendario se genera sin Real Madrid

### Caso 2: Equipos pendientes de aprobación

**Situación:** 3 equipos nuevos están en estado "Pendiente"

**Acción:**
1. El sistema los detecta automáticamente como inactivos
2. El análisis muestra "Motivo: Equipo no aprobado o desactivado"
3. Solo se genera calendario con equipos aprobados

### Caso 3: Liga con equipos impares

**Situación:** 7 equipos activos después de que 1 abandonó

**Acción:**
1. El sistema detecta número impar
2. Muestra alerta informativa sobre el descanso rotatorio
3. Genera calendario donde cada equipo descansa 1 vez por ronda

## Archivos Relacionados

- `zona-gol/lib/utils/calendar-adjuster.ts` - Lógica de análisis y generación
- `zona-gol/components/league-admin/calendar-view.tsx` - UI y funcionalidad
- `zona-gol/components/league-admin/fixture-generator.tsx` - Generador inicial

## Soporte Técnico

Para problemas o mejoras:
1. Verificar que los equipos tengan `is_active` correctamente configurado
2. Revisar que los partidos tengan el `tournament_id` correcto
3. Comprobar permisos de base de datos para eliminar/insertar partidos
