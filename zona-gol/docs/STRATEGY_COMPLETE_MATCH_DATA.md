# 📊 Estrategia: Capturar TODA la Información del Partido

## 🎯 Objetivo

Mejorar la función `generate_match_result_content()` para incluir **TODA** la información relevante del partido en el `content_text` de `league_knowledge_base`, permitiendo que el AI Agent tenga contexto completo.

---

## 📋 Información que ahora se captura

### ✅ Información Básica
- 🏆 **Liga** y **Torneo**
- 📅 **Jornada/Round** (ahora incluido)
- 📆 **Fecha y hora** del partido
- 🏟️ **Número de cancha** (si está disponible)
- ⚽ **Marcador final**
- 🏆 **Tipo de resultado** (Victoria Local/Visitante/Empate)

### ✅ Estadísticas de Jugadores
- ⚽ **Goleadores** (con número de camiseta)
  - Cantidad de goles por jugador
  - **Asistencias** (si están en player_stats)
- 🟥 **Tarjetas rojas / Expulsados** (NUEVO)
  - Nombre del jugador
  - Número de camiseta
- 🟨 **Tarjetas amarillas** (NUEVO)
  - Nombre del jugador
  - Número de camiseta
  - Cantidad (si tiene más de una)

### ✅ Información Adicional
- 📊 **Fase del torneo** (Grupos/Playoff/etc.)
- 📋 **Observaciones del árbitro** (si existen)

---

## 🔧 Aplicar la Migración

### **Paso 1: Ejecutar la migración en Supabase**

1. Abre **Supabase SQL Editor**
2. Ejecuta el archivo: `supabase/migrations/20251216000001_improve_match_content_full_details.sql`
3. Verifica que no haya errores

```sql
-- La función se actualizará automáticamente
-- Verifica que existe:
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'generate_match_result_content';
```

---

### **Paso 2: Regenerar contenido de partidos existentes**

Para actualizar los partidos que **ya están finalizados** con la nueva información:

#### **Opción A: Actualizar todos los partidos finalizados**

```sql
-- Regenerar contenido para todos los partidos finalizados
DO $$
DECLARE
  v_match RECORD;
BEGIN
  FOR v_match IN
    SELECT id, status
    FROM matches
    WHERE status = 'finished'
    ORDER BY match_date DESC
  LOOP
    -- Llamar al trigger manualmente para regenerar contenido
    PERFORM auto_update_knowledge_base_on_match_finish()
    FROM matches
    WHERE id = v_match.id;

    RAISE NOTICE 'Actualizado partido: %', v_match.id;
  END LOOP;
END $$;
```

#### **Opción B: Actualizar solo partidos de una liga específica**

```sql
-- Regenerar solo para una liga
DO $$
DECLARE
  v_match RECORD;
  v_league_id UUID := 'TU-LEAGUE-ID-AQUI'; -- Reemplaza con tu league_id
BEGIN
  FOR v_match IN
    SELECT m.id
    FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.league_id = v_league_id
    AND m.status = 'finished'
    ORDER BY m.match_date DESC
  LOOP
    -- Forzar regeneración del contenido
    UPDATE matches
    SET updated_at = NOW()
    WHERE id = v_match.id;

    RAISE NOTICE 'Actualizado partido: %', v_match.id;
  END LOOP;
END $$;
```

#### **Opción C: Actualizar un partido específico**

```sql
-- Solo un partido
UPDATE matches
SET updated_at = NOW()
WHERE id = 'MATCH-ID-AQUI';

-- Verificar que se actualizó
SELECT
  id,
  LEFT(content_text, 200) as preview,
  LENGTH(content_text) as chars,
  updated_at
FROM league_knowledge_base
WHERE match_id = 'MATCH-ID-AQUI'
AND content_type = 'resultado_partido';
```

---

### **Paso 3: Regenerar embeddings para partidos actualizados**

Después de regenerar el contenido, necesitas regenerar los embeddings.

#### **Opción A: Desde Flutter (Recomendado)**

El webhook se llamará automáticamente cuando finalices un partido nuevo.

Para partidos existentes, **NO** hay forma automática. Necesitarías:
1. Crear un endpoint en n8n que acepte un `match_id`
2. Llamarlo manualmente o desde un script

#### **Opción B: Desde n8n workflow manual**

Crea un workflow en n8n que:

1. **Schedule Trigger** (manual o cron)
2. **Postgres**: Obtener partidos sin embedding o con contenido desactualizado
```sql
SELECT
  kb.id as knowledge_base_id,
  kb.match_id,
  kb.content_text,
  kb.updated_at,
  m.match_date
FROM league_knowledge_base kb
JOIN matches m ON kb.match_id = m.id
WHERE kb.content_type = 'resultado_partido'
AND (
  kb.embedding IS NULL
  OR kb.updated_at > NOW() - INTERVAL '1 hour'
)
ORDER BY m.match_date DESC
LIMIT 50;
```
3. **Loop Over Items**
4. **OpenAI Embeddings** (text-embedding-ada-002)
5. **Postgres Update** (actualizar embedding)

---

### **Paso 4: Verificar que todo funciona**

#### **Verificar contenido actualizado:**

```sql
-- Ver el contenido de un partido reciente
SELECT
  m.id as match_id,
  ht.name || ' vs ' || at.name as partido,
  m.round as jornada,
  kb.content_text,
  LENGTH(kb.content_text) as caracteres,
  kb.embedding IS NOT NULL as tiene_embedding,
  kb.updated_at
FROM matches m
JOIN teams ht ON m.home_team_id = ht.id
JOIN teams at ON m.away_team_id = at.id
LEFT JOIN league_knowledge_base kb ON kb.match_id = m.id
WHERE m.status = 'finished'
ORDER BY m.match_date DESC
LIMIT 5;
```

#### **Verificar que incluye nueva información:**

Busca en el `content_text`:
- ✅ "Jornada:" - debe aparecer
- ✅ "🟥 TARJETAS ROJAS" - si hubo expulsados
- ✅ "🟨 TARJETAS AMARILLAS" - si hubo amarillas
- ✅ "Cancha:" - si el partido tiene field_number

```sql
-- Verificar que incluye jornada
SELECT
  m.id,
  m.round,
  kb.content_text LIKE '%Jornada:%' as tiene_jornada,
  kb.content_text LIKE '%TARJETAS ROJAS%' as tiene_rojas,
  kb.content_text LIKE '%TARJETAS AMARILLAS%' as tiene_amarillas
FROM matches m
LEFT JOIN league_knowledge_base kb ON kb.match_id = m.id
WHERE m.status = 'finished'
AND kb.content_type = 'resultado_partido'
ORDER BY m.match_date DESC
LIMIT 10;
```

---

## 🎨 Ejemplo de Salida

### **Antes (sin jornada, sin tarjetas):**

```
⚽ RESULTADO DEL PARTIDO

🏆 LIGA PREMIER
🏅 APERTURA-2026
📅 16/12/2025 15:00

RESULTADO FINAL:
PUEBLA  2 - 2  TECOS

Empate: Empate

⚽ GOLEADORES:

PUEBLA:
  • JAIME DURAN (#2) - 2 goles

TECOS:
  • OSMAR DONIZZETE (#2) - 2 goles
```

### **Después (con toda la información):**

```
⚽ RESULTADO DEL PARTIDO

🏆 Liga: LIGA PREMIER
🏅 Torneo: APERTURA-2026
📅 Jornada: 1
📆 Fecha: 16/12/2025 15:00 | Cancha: 2

RESULTADO FINAL:
PUEBLA  2 - 2  TECOS

Empate: Empate

⚽ GOLEADORES:

PUEBLA:
  • JAIME DURAN (#2) - 2 goles + 1 asistencia(s)

TECOS:
  • OSMAR DONIZZETE (#2) - 2 goles

🟥 TARJETAS ROJAS (EXPULSADOS):

PUEBLA:
  • CARLOS MARTINEZ (#5)

🟨 TARJETAS AMARILLAS:

PUEBLA:
  • LUIS GARCIA (#7)
  • PEDRO SANCHEZ (#10)

TECOS:
  • JUAN LOPEZ (#3)
```

---

## 📊 Beneficios

### **Para el AI Agent:**
- ✅ **Contexto completo** - puede responder preguntas específicas
- ✅ **Mejor precisión** - información detallada sobre disciplina
- ✅ **Respuestas ricas** - incluye todos los detalles del partido

### **Ejemplos de preguntas que ahora puede responder:**

**Usuario:** "¿Hubo expulsados en el partido de PUEBLA?"
**AI Agent:** "Sí, en el partido PUEBLA 2-2 TECOS de la Jornada 1, hubo un expulsado: Carlos Martinez (#5) de PUEBLA."

**Usuario:** "¿En qué jornada jugó PUEBLA vs TECOS?"
**AI Agent:** "PUEBLA vs TECOS fue en la Jornada 1 de APERTURA-2026."

**Usuario:** "¿Cuántas amarillas hubo?"
**AI Agent:** "Hubo 3 tarjetas amarillas: 2 para PUEBLA (Luis Garcia y Pedro Sanchez) y 1 para TECOS (Juan Lopez)."

---

## 🚀 Próximos Pasos

### **1. Agregar más estadísticas (opcional):**

Si en el futuro quieres agregar más datos al contenido, puedes modificar la función para incluir:
- 📊 **Posesión del balón** (si se captura)
- 🎯 **Tiros a gol** (si se captura)
- ⏱️ **Minuto de los goles** (si se captura en player_stats)
- 🔄 **Sustituciones** (si tienes tabla de subs)

### **2. Crear workflow automático de regeneración:**

En n8n, crea un workflow que:
- Se ejecute cada 6 horas
- Busque partidos finalizados sin embedding o desactualizados
- Regenere embeddings automáticamente

### **3. Monitorear calidad de embeddings:**

```sql
-- Ver estadísticas de knowledge base
SELECT
  content_type,
  COUNT(*) as total,
  COUNT(embedding) as con_embedding,
  AVG(LENGTH(content_text)) as promedio_caracteres,
  MIN(LENGTH(content_text)) as min_chars,
  MAX(LENGTH(content_text)) as max_chars
FROM league_knowledge_base
GROUP BY content_type;
```

---

## 📝 Checklist de Implementación

- [ ] Ejecutar migración `20251216000001_improve_match_content_full_details.sql`
- [ ] Verificar que la función se actualizó correctamente
- [ ] Regenerar contenido de partidos existentes (Opción A, B o C)
- [ ] Verificar que el nuevo contenido incluye jornada y tarjetas
- [ ] Regenerar embeddings (manual o workflow)
- [ ] Probar el AI Agent con preguntas específicas
- [ ] Monitorear calidad de respuestas

---

**¿Necesitas ayuda con algún paso?** Avísame y te ayudo a implementarlo.
