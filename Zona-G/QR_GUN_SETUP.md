# Configuración de Pistola Lectora QR

## Problema Común: Layout de Teclado Incorrecto

Cuando la pistola QR está configurada con layout de teclado **Español** pero el QR contiene caracteres **US/Inglés**, los datos llegan corruptos:

```
❌ Incorrecto: 3type3.3plqyer8verificqtion3...
✅ Correcto:   {"type":"player_verification"...
```

## Solución 1: Configurar la Pistola (Recomendado)

### Pasos Generales

1. **Buscar el manual de tu pistola** - Cada marca tiene códigos de configuración diferentes

2. **Escanear código de configuración de layout US/Inglés**
   - Busca en el manual: "Keyboard Layout", "Country Code", o "Language"
   - Escanea el código para "US English" o "United States"

3. **Códigos comunes por marca:**

#### Honeywell / Metrologic
```
Escanear: *KBDUS*
```

#### Symbol / Zebra
Escanear el código de barras de configuración "US Keyboard"

#### Datalogic
Escanear código: "USA Keyboard"

#### Pistolas Genéricas (China)
Muchas pistolas chinas tienen un manual con códigos QR para configurar. Busca "English Keyboard" o "US Layout".

### Verificar Configuración

Después de configurar, escanea este texto de prueba:
```
{"test":"ok"}
```

Si ves exactamente `{"test":"ok"}` en la pantalla, la configuración es correcta.

## Solución 2: Traducción Automática (Fallback)

La app Zona-G incluye traducción automática para el patrón de teclado español más común. Si la pistola no se puede configurar, la app intentará corregir los datos automáticamente.

**Nota:** Esta es una solución de respaldo. La configuración correcta de la pistola siempre es preferible.

## Requisitos de la Pistola

- **Modo HID (Teclado)**: La pistola debe funcionar como teclado USB/Bluetooth
- **Terminador Enter**: Debe enviar Enter al final del escaneo
- **Sin prefijos/sufijos**: Configurar la pistola sin caracteres adicionales

## Formato del QR Esperado

```json
{
  "type": "player_verification",
  "player_id": "uuid-del-jugador",
  "player_name": "NOMBRE DEL JUGADOR",
  "team_id": "uuid-del-equipo",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0",
  "jersey_number": 10,
  "league_id": "uuid-de-la-liga"
}
```

## Solución de Problemas

### Los caracteres llegan mal
- Verificar layout de teclado de la pistola
- Verificar configuración regional del dispositivo Android

### No detecta el escaneo
- Verificar que la pistola esté en modo HID
- Verificar conexión USB/Bluetooth
- Probar con un editor de texto para ver si llegan los caracteres

### Escaneo muy lento
- Reducir el timeout en la configuración de la pistola
- Verificar que no haya delay configurado

## Contacto

Si tienes problemas con la configuración de tu pistola QR, contacta al soporte técnico de Zona-G.
