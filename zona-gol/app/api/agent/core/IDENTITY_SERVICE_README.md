# Identity Service

## Descripción

El `IdentityService` es el servicio foundation del Agent Service. Maneja la identidad del usuario y el contexto multi-tenant, resolviendo la cadena: **WhatsApp phone → User → League → Tournament**.

## Características

- ✅ Resolución de identidad multi-canal (WhatsApp, Web, Mobile)
- ✅ Vinculación segura de números WhatsApp a usuarios
- ✅ Contexto multi-tenant obligatorio (league_id)
- ✅ Sistema de permisos por rol
- ✅ Normalización de números telefónicos
- ✅ Soft delete de vinculaciones
- ✅ Generación de códigos de verificación

## Uso Básico

### 1. Resolver Identidad desde WhatsApp

```typescript
import { IdentityService } from './core/identity.service';

// Usuario enviando mensaje por WhatsApp
const phoneNumber = '+52 55 1234 5678';

const identity = await IdentityService.resolveIdentity(
  phoneNumber,
  'whatsapp'
);

if (!identity.isLinked) {
  // Usuario NO vinculado
  console.log('Usuario no vinculado. Debe vincular su WhatsApp primero.');

  // Responder con instrucciones:
  // "Para usar este servicio, primero debes vincular tu WhatsApp desde la app..."

} else {
  // Usuario vinculado ✅
  console.log(`Usuario: ${identity.displayName}`);
  console.log(`Liga: ${identity.leagueId}`);
  console.log(`Torneo: ${identity.tournamentId}`);
  console.log(`Rol: ${identity.role}`);

  // Ahora puedes consultar datos de su liga/torneo
}
```

### 2. Resolver Identidad desde Web/Mobile

```typescript
// Usuario autenticado en web o mobile
const userId = 'user-uuid-here';

const identity = await IdentityService.resolveIdentity(
  userId,
  'web' // o 'mobile'
);

// Usuario autenticado siempre está vinculado
console.log(`Usuario: ${identity.displayName}`);
console.log(`Liga: ${identity.leagueId}`);
console.log(`Rol: ${identity.role}`);
```

### 3. Vincular WhatsApp a Usuario

```typescript
// Paso 1: Generar código de verificación
const code = IdentityService.generateVerificationCode();
console.log(`Código: ${code}`); // Ej: "123456"

// Enviar código por WhatsApp (vía n8n/Twilio)
await sendWhatsAppMessage(phoneNumber, `Tu código es: ${code}`);

// Guardar código temporalmente (Redis o DB)
await saveVerificationCode(phoneNumber, code);

// Paso 2: Usuario ingresa código en la app
// Paso 3: Verificar y vincular
const verifiedCode = await verifyCode(phoneNumber, userInputCode);

if (verifiedCode) {
  // Vincular
  const link = await IdentityService.linkWhatsAppUser(
    phoneNumber,
    userId,
    leagueId,
    tournamentId, // o null
    'team_owner' // rol del usuario
  );

  console.log('✅ WhatsApp vinculado:', link);
}
```

### 4. Verificar Permisos

```typescript
const identity = await IdentityService.resolveIdentity(
  userIdentifier,
  channel
);

// Verificar si puede ver partidos
const canViewMatches = await IdentityService.checkPermission(
  identity,
  'view_matches'
);

// Verificar si puede administrar liga específica
const canManageLeague = await IdentityService.checkPermission(
  identity,
  'manage_league',
  'league-uuid-here'
);

if (!canManageLeague) {
  throw new Error('No tienes permisos para administrar esta liga');
}
```

### 5. Obtener Vinculaciones de una Liga

```typescript
// Listar todos los WhatsApp vinculados a una liga
const links = await IdentityService.getLeagueWhatsAppLinks(leagueId);

links.forEach(link => {
  console.log(`${link.phoneNumber} - ${link.displayName} (${link.role})`);
});
```

### 6. Desvincular WhatsApp

```typescript
await IdentityService.unlinkWhatsAppUser(phoneNumber);
console.log('✅ WhatsApp desvinculado');
```

### 7. Verificar si Teléfono está Vinculado

```typescript
const isLinked = await IdentityService.isPhoneLinked('+5215512345678');

if (isLinked) {
  console.log('Este teléfono ya está vinculado a otro usuario');
}
```

## Estructura de UserIdentity

```typescript
interface UserIdentity {
  // Identificación
  userIdentifier: string;  // Phone o user_id
  channel: Channel;        // 'whatsapp' | 'web' | 'mobile'

  // Usuario vinculado (si isLinked = true)
  userId?: string;
  role?: UserRole;

  // Contexto multi-tenant (CRÍTICO)
  leagueId?: string;       // OBLIGATORIO para consultas
  tournamentId?: string;

  // Metadata
  displayName?: string;
  preferredLanguage?: string;

  // Estado de vinculación
  isLinked: boolean;       // false = usuario NO vinculado
}
```

## Sistema de Permisos

| Rol | Acciones Permitidas |
|-----|---------------------|
| `super_admin` | TODO (acceso global) |
| `league_admin` | Administrar su liga, ver todas las conversaciones de su liga |
| `team_owner` | Ver partidos, tabla, info de su equipo |
| `user` / `public` | Ver partidos y tabla (solo lectura) |

## Casos de Uso Comunes

### Caso 1: Usuario WhatsApp NO vinculado

**Flujo:**
1. Usuario envía mensaje por WhatsApp
2. `resolveIdentity()` retorna `isLinked: false`
3. Agente responde: "Para usar este servicio, primero vincula tu WhatsApp..."
4. Usuario abre app → va a Configuración → Vincular WhatsApp
5. App muestra form con código de verificación
6. Usuario ingresa código recibido por WhatsApp
7. `linkWhatsAppUser()` crea vinculación
8. ✅ Usuario puede usar el agente

### Caso 2: League Admin consultando desde Web

**Flujo:**
1. Admin autenticado en web abre chat del agente
2. `resolveIdentity(userId, 'web')` obtiene contexto
3. Identidad incluye `league_id` automáticamente
4. Agente puede responder con data de su liga

### Caso 3: Cambio de Torneo Activo

**Flujo:**
1. Admin crea nuevo torneo en la liga
2. Actualizar vinculación WhatsApp:
```typescript
await IdentityService.updateActiveTournament(
  phoneNumber,
  newTournamentId
);
```
3. ✅ Siguientes consultas usan el nuevo torneo

## Normalización de Teléfonos

El servicio normaliza automáticamente números de teléfono:

**Entrada** → **Salida**
- `55 1234 5678` → `+5512345678`
- `+52 (55) 1234-5678` → `+525512345678`
- `521234567890` → `+521234567890`

**Formato esperado:** Internacional con prefijo `+`

## Seguridad

### Multi-tenant Blindado

```typescript
// ❌ INCORRECTO - Sin verificar league_id
const matches = await supabase
  .from('matches')
  .select('*');

// ✅ CORRECTO - Siempre filtrar por league_id
const identity = await IdentityService.resolveIdentity(...);

if (!identity.leagueId) {
  throw new Error('No league context');
}

const matches = await supabase
  .from('matches')
  .select('*')
  .eq('league_id', identity.leagueId);
```

### Soft Delete

Las vinculaciones NO se eliminan, se marcan como inactivas:

```typescript
// Esto NO borra el registro, solo marca is_active = false
await IdentityService.unlinkWhatsAppUser(phone);

// Se puede reactivar manualmente en la DB si es necesario
```

## Integración con Otros Servicios

### Con RAGService

```typescript
const identity = await IdentityService.resolveIdentity(phone, 'whatsapp');

if (!identity.leagueId) {
  return 'Debes vincular tu WhatsApp primero';
}

// Buscar en RAG solo del contexto del usuario
const chunks = await RAGService.searchKnowledge(
  query,
  identity.leagueId,    // Filtro obligatorio
  identity.tournamentId  // Filtro opcional
);
```

### Con LLMService

```typescript
const identity = await IdentityService.resolveIdentity(phone, 'whatsapp');

// Pasar identidad al LLM para personalizar respuesta
const response = await LLMService.generateResponse({
  identity,
  userMessage: 'Cuándo juega mi equipo?',
  // ...
});

// El LLM puede usar identity.role para adaptar el tono
// El LLM puede usar identity.displayName para personalizar
```

## Testing

```bash
# Tests unitarios
npm run test app/api/agent/core/identity.service.test.ts

# Tests de integración (requieren DB de prueba)
npm run test:integration
```

## Ejemplos de Logs

```
✅ WhatsApp +5215512345678 linked to user abc123, league xyz789
📱 WhatsApp +5219876543210 not linked
✅ User abc123 authenticated, league xyz789, tournament def456
✅ WhatsApp +5215512345678 linked to user abc123 in league xyz789
✅ WhatsApp +5215512345678 unlinked
✅ Tournament updated to new-tournament-id for +5215512345678
```

## Próximos Pasos

Una vez implementado IdentityService, continuar con:

1. **RouterService** - Clasificación de intención
2. **RAGService** - Búsqueda vectorial con filtros
3. **SQLService** - Queries directas a DB
4. **LLMService** - Generación de respuestas
5. **Agent** - Orquestador que usa todos los servicios

---

**Última actualización:** 2025-01-18
**Autor:** Claude Code
**Estado:** ✅ Implementado
