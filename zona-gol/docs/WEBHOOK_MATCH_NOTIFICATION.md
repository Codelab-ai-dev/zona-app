# 🔔 Webhook de Notificación de Partido Finalizado

## 🎯 Descripción

Cuando un partido se finaliza en la app Flutter (Zona-G), se envía automáticamente una notificación al webhook de n8n con **toda la información del partido**.

**URL del Webhook:**
```
https://n8n.zona-gol.com/webhook-test/zona-gol
```

---

## 📊 Estructura del JSON

### **Ejemplo Completo:**

```json
{
  "event": "match_finalized",
  "timestamp": "2025-12-16T18:30:00.000Z",
  "match": {
    "id": "abc123-def456-ghi789",
    "date": "2025-12-16T15:00:00.000Z",
    "time": "15:00:00",
    "field_number": 2,
    "round": 1,
    "status": "finished",
    "phase": "group",
    "playoff_round": null
  },
  "score": {
    "home": 2,
    "away": 2,
    "result": "draw"
  },
  "home_team": {
    "id": "team-home-id",
    "name": "PUEBLA",
    "score": 2,
    "stats": {
      "points": 13,
      "position": 2,
      "matches_played": 5
    }
  },
  "away_team": {
    "id": "team-away-id",
    "name": "TECOS",
    "score": 2,
    "stats": {
      "points": 10,
      "position": 4,
      "matches_played": 5
    }
  },
  "tournament": {
    "id": "tournament-id",
    "name": "APERTURA-2026"
  },
  "player_highlights": [
    {
      "player_id": "player-1-id",
      "goals": 2,
      "assists": 1,
      "yellow_cards": 0,
      "red_cards": 0,
      "player": {
        "name": "JAIME DURAN",
        "jersey_number": 2,
        "team_id": "team-home-id"
      }
    },
    {
      "player_id": "player-2-id",
      "goals": 2,
      "assists": 0,
      "yellow_cards": 0,
      "red_cards": 0,
      "player": {
        "name": "OSMAR DONIZZETE",
        "jersey_number": 2,
        "team_id": "team-away-id"
      }
    },
    {
      "player_id": "player-3-id",
      "goals": 0,
      "assists": 0,
      "yellow_cards": 0,
      "red_cards": 1,
      "player": {
        "name": "CARLOS MARTINEZ",
        "jersey_number": 5,
        "team_id": "team-home-id"
      }
    }
  ]
}
```

---

## 📋 Campos Detallados

### **`event`** (string)
- Tipo de evento, siempre será: `"match_finalized"`

### **`timestamp`** (ISO 8601 string)
- Fecha y hora en que se envió la notificación

### **`match`** (object)
Información del partido:
- **`id`**: UUID del partido
- **`date`**: Fecha y hora del partido (ISO 8601)
- **`time`**: Hora del partido (formato HH:MM:SS)
- **`field_number`**: Número de cancha (puede ser null)
- **`round`**: Número de jornada (puede ser null)
- **`status`**: Estado del partido (siempre "finished")
- **`phase`**: Fase del torneo ("group", "playoff", etc.)
- **`playoff_round`**: Ronda del playoff (si aplica)

### **`score`** (object)
Marcador final:
- **`home`**: Goles del equipo local
- **`away`**: Goles del equipo visitante
- **`result`**: Resultado ("home_win", "away_win", "draw")

### **`home_team`** / **`away_team`** (object)
Información de cada equipo:
- **`id`**: UUID del equipo
- **`name`**: Nombre del equipo
- **`score`**: Goles anotados
- **`stats`**: Estadísticas actualizadas del equipo en el torneo
  - `points`: Puntos totales
  - `position`: Posición en la tabla
  - `matches_played`: Partidos jugados

### **`tournament`** (object)
- **`id`**: UUID del torneo
- **`name`**: Nombre del torneo

### **`player_highlights`** (array)
Lista de jugadores con goles o tarjetas rojas:
- **`player_id`**: UUID del jugador
- **`goals`**: Goles anotados en el partido
- **`assists`**: Asistencias (si está disponible)
- **`yellow_cards`**: Tarjetas amarillas
- **`red_cards`**: Tarjetas rojas
- **`player`**: Información del jugador
  - `name`: Nombre del jugador
  - `jersey_number`: Número de camiseta
  - `team_id`: UUID del equipo al que pertenece

---

## 🔧 Configuración del Webhook en n8n

### **Paso 1: Crear Webhook Node**

En n8n, crea un workflow con un nodo **Webhook**:

```
HTTP Method: POST
Path: /webhook-test/zona-gol
Response Mode: When Last Node Finishes
Authentication: None (o Header Auth si prefieres)
```

### **Paso 2: Procesar la Notificación**

Ejemplo de workflow:

```
[Webhook]
  ↓
[Code] Extraer información
  ↓
[IF] ¿Hay goles?
  ↓ (yes)
  [Slack/Email] Notificar resultado
  ↓
[IF] ¿Hay expulsados?
  ↓ (yes)
  [Discord] Notificar expulsión
  ↓
[Supabase] Guardar estadísticas adicionales
  ↓
[Respond to Webhook]
```

### **Paso 3: Ejemplo de Código para Procesar**

**Code Node:**
```javascript
const payload = $input.item.json.body;

// Extraer información relevante
const matchInfo = {
  matchId: payload.match.id,
  homeTeam: payload.home_team.name,
  awayTeam: payload.away_team.name,
  score: `${payload.score.home} - ${payload.score.away}`,
  result: payload.score.result,
  jornada: payload.match.round,
  tournament: payload.tournament.name
};

// Contar eventos importantes
const goals = payload.player_highlights.filter(p => p.goals > 0);
const redCards = payload.player_highlights.filter(p => p.red_cards > 0);

// Goleadores
const topScorers = goals.map(p => ({
  name: p.player.name,
  team: p.player.team_id === payload.home_team.id
    ? payload.home_team.name
    : payload.away_team.name,
  goals: p.goals,
  assists: p.assists || 0
}));

// Expulsados
const expelled = redCards.map(p => ({
  name: p.player.name,
  jersey: p.player.jersey_number,
  team: p.player.team_id === payload.home_team.id
    ? payload.home_team.name
    : payload.away_team.name
}));

return [{
  json: {
    ...matchInfo,
    topScorers,
    expelled,
    hasGoals: goals.length > 0,
    hasRedCards: redCards.length > 0
  }
}];
```

---

## 📧 Casos de Uso

### **1. Notificación en Slack/Discord**

Cuando se finaliza un partido, enviar mensaje:

```
⚽ PARTIDO FINALIZADO - Jornada 1

PUEBLA 2 - 2 TECOS
Empate

🏆 Torneo: APERTURA-2026
📅 Fecha: 16/12/2025 15:00
🏟️ Cancha: 2

⚽ Goleadores:
• JAIME DURAN (PUEBLA) - 2 goles
• OSMAR DONIZZETE (TECOS) - 2 goles

🟥 Expulsados:
• CARLOS MARTINEZ #5 (PUEBLA)

📊 Tabla actualizada:
PUEBLA - 13 pts (Pos. 2)
TECOS - 10 pts (Pos. 4)
```

### **2. Actualizar Sistemas Externos**

- Sincronizar con base de datos externa
- Actualizar sitio web público
- Enviar notificaciones push a apps móviles

### **3. Análisis de Datos**

- Guardar estadísticas en Google Sheets
- Enviar a BigQuery para análisis
- Actualizar dashboard en tiempo real

### **4. Automatización de Reportes**

- Generar reporte PDF del partido
- Enviar email a administradores
- Actualizar redes sociales automáticamente

---

## 🧪 Testing del Webhook

### **Opción 1: Desde Postman**

```bash
POST https://n8n.zona-gol.com/webhook-test/zona-gol
Content-Type: application/json

{
  "event": "match_finalized",
  "timestamp": "2025-12-16T18:30:00.000Z",
  "match": {
    "id": "test-match-id",
    "date": "2025-12-16T15:00:00.000Z",
    "round": 1
  },
  "score": {
    "home": 3,
    "away": 1,
    "result": "home_win"
  },
  "home_team": {
    "name": "EQUIPO A",
    "score": 3
  },
  "away_team": {
    "name": "EQUIPO B",
    "score": 1
  },
  "tournament": {
    "name": "TEST TOURNAMENT"
  },
  "player_highlights": []
}
```

### **Opción 2: Desde Flutter (Real)**

Finaliza un partido en la app Zona-G y verifica los logs:

```
🔔 Enviando notificación de partido finalizado: abc123-def456
✅ Notificación enviada exitosamente
   Response: {"success": true}
```

---

## 🛡️ Seguridad (Opcional)

Para producción, puedes agregar autenticación:

### **Header Auth:**

**En Flutter (`match_service.dart`):**
```dart
final response = await http.post(
  Uri.parse(_notificationWebhookUrl),
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'tu-secret-key-aqui', // ← Agregar
  },
  body: jsonEncode(payload),
);
```

**En n8n (Webhook Node):**
- Authentication: Header Auth
- Header Name: `X-API-Key`
- Header Value: `tu-secret-key-aqui`

---

## 📊 Monitoreo

### **Ver logs en Flutter:**

Cuando finalices un partido, verás:
```
🏁 Finalizando partido: abc123-def456 (2-2)
✅ Partido actualizado: abc123-def456
📝 Guardando observaciones del árbitro...
✅ Observaciones del árbitro guardadas
✅ Estadísticas del equipo local actualizadas: 13 puntos
✅ Estadísticas del equipo visitante actualizadas: 10 puntos
🔄 Generando embedding para partido: abc123-def456
🔔 Enviando notificación de partido finalizado: abc123-def456
✅ Partido finalizado exitosamente con estadísticas actualizadas
📝 Contenido encontrado (450 caracteres)
✅ Embedding generado exitosamente
✅ Notificación enviada exitosamente
```

### **Ver logs en n8n:**

En n8n → Executions, verás cada vez que se recibe el webhook.

---

## 🚀 Próximos Pasos

1. ✅ Implementación completada en Flutter
2. ⏭️ Crear workflow en n8n para procesar notificaciones
3. ⏭️ Configurar acciones (Slack, Discord, Email, etc.)
4. ⏭️ Agregar autenticación si es necesario
5. ⏭️ Monitorear y ajustar según necesidades

---

## 🎉 Beneficios

✅ **Tiempo real:** Las notificaciones se envían inmediatamente al finalizar
✅ **Información completa:** Incluye todos los datos del partido
✅ **Estadísticas actualizadas:** Posiciones y puntos después del partido
✅ **Jugadores destacados:** Goleadores y expulsados automáticamente
✅ **Flexible:** Puedes procesar la notificación como quieras en n8n
✅ **No bloqueante:** Si el webhook falla, no afecta la finalización del partido

---

**¿Necesitas ayuda configurando el workflow en n8n?** Avísame y te ayudo a crear las automatizaciones.
