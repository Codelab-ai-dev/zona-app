# 📱 Configuración de Notificaciones WhatsApp (Kapso)

## 🎯 Descripción

La app Flutter envía automáticamente un mensaje de WhatsApp cuando se finaliza un partido, usando la API de Kapso.

---

## 🔧 Configuración

### **Paso 1: Obtener Credenciales de Kapso**

1. **Accede al Dashboard de Kapso**
   - URL: https://kapso.ai (o el dashboard que te dieron)
   - Inicia sesión con tu cuenta

2. **Obtén el Access Token**
   - Ve a Settings → API Keys
   - Copia el token (formato: `EAAxxxxxxxxxxxxxx`)

3. **Verifica el WABA ID**
   - El ID de tu cuenta de WhatsApp Business
   - Ya está en la URL: `860360857167907`
   - Verifica que sea correcto en el dashboard

---

### **Paso 2: Configurar en Flutter**

Abre el archivo: `Zona-G/lib/services/match_service.dart`

Busca estas líneas (21-28) y reemplaza los valores:

```dart
// Kapso WhatsApp API configuration
static const String _kapsoWhatsAppUrl =
    'https://api.kapso.ai/meta/whatsapp/v21.0/860360857167907/messages';
static const String _kapsoAccessToken =
    'TU_KAPSO_ACCESS_TOKEN_AQUI'; // ← REEMPLAZAR AQUÍ
// Número de WhatsApp al que enviar notificaciones (formato: 521234567890)
static const String _whatsappNotificationNumber =
    '521234567890'; // ← REEMPLAZAR AQUÍ
```

**Ejemplo configurado:**
```dart
static const String _kapsoAccessToken =
    'EAAGZBPxPqMhYBO4xVE5uLZCQhwXbERAkZBj...'; // Tu token real

static const String _whatsappNotificationNumber =
    '5213331234567'; // Tu número de WhatsApp (sin + ni espacios)
```

⚠️ **IMPORTANTE:**
- El número debe incluir código de país (52 para México)
- Sin el símbolo `+`
- Sin espacios ni guiones
- Ejemplo: `5213331234567`

---

### **Paso 3: Guardar y Compilar**

1. **Guarda el archivo** `match_service.dart`
2. **Compila la app** de nuevo
3. **Instala en tu dispositivo**

---

## 📝 Formato del Mensaje

Cuando finalizas un partido, se envía este mensaje:

```
⚽ *PARTIDO FINALIZADO*

PUEBLA *2 - 2* TECOS

🤝 *Empate*

📅 Jornada: 1
🏆 APERTURA-2026
📆 16/12/2025 15:00
🏟️ Cancha 2

⚽ *Goleadores:*
• JAIME DURAN (#2) - 2 goles
• OSMAR DONIZZETE (#2) - 2 goles

🟥 *Expulsados:*
• CARLOS MARTINEZ (#5)

---
_Notificación automática de Zona-G_
```

---

## 🧪 Testing

### **1. Finaliza un partido de prueba**

En la app:
1. Navega a un partido
2. Ingresa estadísticas
3. Finaliza el partido

### **2. Verifica los logs**

En la consola de Flutter verás:

```
🏁 Finalizando partido: abc123-def456 (2-2)
✅ Partido actualizado: abc123-def456
...
📱 Enviando notificación de WhatsApp vía Kapso...
📤 Enviando mensaje a WhatsApp: 5213331234567
✅ Mensaje de WhatsApp enviado exitosamente
   Response: {"messages":[{"id":"wamid.xxx..."}]}
```

### **3. Verifica WhatsApp**

El número configurado debe recibir el mensaje inmediatamente.

---

## ❌ Troubleshooting

### **Error: 401 Unauthorized**

```
⚠️ Error enviando WhatsApp: 401
```

**Solución:**
- Verifica que el `_kapsoAccessToken` sea correcto
- Asegúrate de incluir `Bearer ` en el header (ya está implementado)

### **Error: 400 Bad Request**

```
⚠️ Error enviando WhatsApp: 400
Response: {"error":{"message":"Invalid phone number"}}
```

**Solución:**
- Verifica el formato del número: `5213331234567`
- No debe tener `+`, espacios, ni guiones
- Debe incluir código de país (52 para México)

### **Error: 403 Forbidden**

```
⚠️ Error enviando WhatsApp: 403
```

**Solución:**
- Verifica que el número esté verificado en Kapso
- Verifica que el WABA ID (`860360857167907`) sea correcto

### **Error: Timeout**

```
⚠️ Error en _sendWhatsAppNotification: Exception: Timeout: Kapso API no respondió en 20 segundos
```

**Solución:**
- Verifica tu conexión a internet
- La API de Kapso podría estar lenta, intenta de nuevo

---

## 🔒 Seguridad

### **IMPORTANTE: No subas credenciales al repositorio**

Si usas Git, asegúrate de no commitear el archivo con el token real.

**Opción 1: Usar variables de entorno** (Recomendado para producción)

Crea un archivo: `Zona-G/lib/config/secrets.dart`

```dart
class Secrets {
  static const String kapsoAccessToken = 'EAAGZBPxPqMhYBO...';
  static const String whatsappNotificationNumber = '5213331234567';
}
```

Luego en `match_service.dart`:

```dart
import '../config/secrets.dart';

static const String _kapsoAccessToken = Secrets.kapsoAccessToken;
static const String _whatsappNotificationNumber = Secrets.whatsappNotificationNumber;
```

Agrega a `.gitignore`:
```
lib/config/secrets.dart
```

**Opción 2: Usar archivo de configuración JSON** (más flexible)

Crea: `Zona-G/assets/config.json`

```json
{
  "kapso_access_token": "EAAGZBPxPqMhYBO...",
  "whatsapp_notification_number": "5213331234567"
}
```

Y cárgalo en runtime.

---

## 📊 Flujo Completo

Cuando finalizas un partido:

```
1. Usuario finaliza partido en Flutter
   ↓
2. Se actualiza Supabase
   ↓
3. Se generan estadísticas (triggers DB)
   ↓
4. Se genera contenido para knowledge_base
   ↓
5. 🔄 Se genera embedding (webhook n8n)
   ↓
6. 📤 Se envía webhook de notificación (n8n)
   ↓
7. 📱 Se envía mensaje de WhatsApp (Kapso) ← NUEVO
   ↓
8. ✅ Partido finalizado
```

---

## 🎯 Casos de Uso

### **1. Notificar al administrador de la liga**
Configura el número del admin para que reciba cada resultado.

### **2. Notificar a un grupo de WhatsApp**
Usa el ID del grupo en lugar del número individual.

### **3. Múltiples destinatarios**
Modifica el método para enviar a varios números:

```dart
static const List<String> _whatsappNotificationNumbers = [
  '5213331234567',  // Admin 1
  '5219876543210',  // Admin 2
];
```

### **4. Notificaciones condicionales**
Solo enviar si hay goles, o solo si hay expulsados:

```dart
// Solo enviar si hay goles
if (homeScore > 0 || awayScore > 0) {
  _sendWhatsAppNotification(matchId, homeScore, awayScore);
}
```

---

## 📈 Costos

**Kapso/WhatsApp Business API:**
- Consulta los precios en tu panel de Kapso
- Típicamente: ~$0.005 - $0.01 por mensaje
- Para 100 partidos/mes: ~$0.50 - $1.00 USD

---

## ✅ Checklist de Implementación

- [ ] Obtener Access Token de Kapso
- [ ] Verificar WABA ID en la URL
- [ ] Configurar `_kapsoAccessToken` en `match_service.dart`
- [ ] Configurar `_whatsappNotificationNumber` con tu número
- [ ] Guardar y compilar la app
- [ ] Hacer prueba finalizando un partido
- [ ] Verificar que llega el mensaje a WhatsApp
- [ ] (Opcional) Mover credenciales a archivo separado

---

## 🆘 Soporte

Si tienes problemas:

1. **Verifica los logs de Flutter** (consola de debug)
2. **Verifica el panel de Kapso** (para ver requests fallidos)
3. **Prueba con Postman** primero (para aislar el problema)

---

**¡Listo!** Ahora cada vez que finalices un partido, recibirás una notificación automática en WhatsApp con el resultado completo.
