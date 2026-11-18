# Zona Play: política de acceso a videos, clips y transmisiones

**Estado:** vigente desde el issue #39. Zona Play sigue **diferido y apagado por defecto** (`PLAY_ENABLED`, #51).
**Código:** `backend/internal/play/access.go` (reglas) y `service.go` (dónde se aplican).

## Metadatos frente a reproducción

- **Metadatos:** título, equipos, marcador, duración, precio y miniatura propia. Dicen *qué* es el contenido.
- **Reproducción:** todo lo que permite cargarlo en un reproductor:
  - `mux_playback_id`;
  - `video_url` o `clip_url`;
  - `mux_asset_id`;
  - los IDs de reproducción de la transmisión y de su grabación;
  - y las **miniaturas de Mux** (`image.mux.com/<playback_id>/…`), porque contienen el ID de reproducción.

Cuando el contenido está restringido para quien consulta, la API devuelve los metadatos sin los campos de reproducción y con `playback_restricted: true`. La web muestra entonces un aviso en lugar del reproductor.

## Matriz

| Contenido | Aparece en listados | Por ID o enlace | Reproducción |
|---|---|---|---|
| `public` (listo) | todos | todos | todos |
| `unlisted` (listo) | solo admins de la liga | todos | todos |
| **premium**: `visibility = premium` o `is_premium = true` | solo admins de la liga, salvo `is_premium` con `visibility = public`, que se lista sin reproducción | todos (metadatos) | **solo admins de la liga** |
| `private` | solo admins de la liga | solo admins de la liga (404 a los demás) | solo admins de la liga |
| no listo (`uploading`, `processing`, `failed`…) | solo admins de la liga | solo admins de la liga (404) | solo admins de la liga |

- **"Admins de la liga"** = quien gestiona la liga del contenido (`CanManageLeague`) y el super admin.
- **Clips:** siguen las reglas de su grabación:
  - ocultos (404) si la grabación está oculta para quien consulta;
  - sin reproducción si la grabación es premium;
  - un clip sin grabación es público.
- **Listados públicos de clips:** solo incluyen clips sin grabación o de grabaciones `public`, listas y no premium (`PlayableOnly`).
- **Transmisiones:** las de **pago por evento** (`is_pay_per_view`) siguen la regla de premium: metadatos públicos y reproducción solo para los admins de su liga. La clave de emisión nunca se publica (#38).

## Sin cobro todavía

No hay compras ni entitlements verificables. La tabla `stream_purchases` existe, pero ningún código la usa. Por eso:
- el contenido premium y de pago **queda protegido**: nadie fuera de la liga lo reproduce;
- **no hay paywall** ni botón de compra en la web.

Cuando exista el flujo de pago, el permiso de reproducción se amplía con un entitlement explícito: compra o pase de liga, vigente y no revocado. Ver la tabla `entitlements` del [ADR de memberships](ADR_MEMBERSHIPS.md) (§3.4).

## Límite conocido: Mux con política `public`

Las subidas y las transmisiones se crean con política de reproducción **`public`** de Mux. La API ya no entrega el ID de reproducción del contenido restringido, pero **quien ya tenga un ID puede reproducirlo directamente en Mux**.
- **Antes de vender contenido:** usar la política **`signed`** de Mux y emitir tokens firmados solo a quien tenga el entitlement.
- **Si hubo contenido premium o privado** publicado mientras Play estuvo expuesto (antes del #69 y de este cambio): crear un ID de reproducción nuevo para esos assets en Mux y borrar el anterior.
