# Zona Gol en Docker

Todo el sistema corre en contenedores:

| Servicio | Qué hace |
| --- | --- |
| `web` | Caddy: sirve la web (React), las imágenes públicas en `/media` y hace de proxy de `/api` hacia la API. |
| `api` | API en Go. Aplica las migraciones al arrancar. |
| `db` | PostgreSQL 16 con pgvector. |

Los datos viven en volúmenes de Docker: `pgdata` (base de datos), `media_public` (logos y fotos) y `media_private` (documentos de identidad; Caddy no lo monta, solo se descargan con enlaces firmados de la API).

## Arrancar

```sh
make up                                  # la primera vez crea deploy/.env con secretos aleatorios
make admin EMAIL=tu@correo.com NAME="Tu nombre"   # crea el super admin (pide la contraseña)
```

Abre http://localhost:8088 e inicia sesión.

### Datos de demostración (opcional)

```sh
make seed
```

Crea una liga con 6 equipos, jugadores y partidos, y tres cuentas (`superadmin@zonagol.local`, `liga@zonagol.local`, `equipo@zonagol.local`) con la contraseña `SEED_PASSWORD` de `deploy/.env`.

## Comandos

| Comando | Para qué |
| --- | --- |
| `make up` | Compila y arranca (o actualiza tras cambios en el código). |
| `make logs` | Logs de la API y de Caddy. Los correos de recuperación de contraseña aparecen aquí mientras no haya SMTP. |
| `make ps` | Estado de los contenedores. |
| `make down` | Detiene todo (los datos se conservan). |
| `make reset` | Detiene todo y **borra** la base de datos y los archivos. |

## Integraciones opcionales

Se activan añadiendo sus variables a `deploy/.env` (lista completa en `backend/.env.example`): `SMTP_*` (correo), `KAPSO_*` (WhatsApp), `MUX_*` (video), `LLM_*` y `OPENAI_API_KEY` (asistente IA). Sin ellas, esas funciones quedan desactivadas y el resto funciona.

## Más adelante: VPS

El mismo stack sirve en producción. En `deploy/.env`: `APP_ENV=production`, `APP_URL=https://tu-dominio`, `SITE_ADDRESS=tu-dominio`, `HTTP_BIND=0.0.0.0:80`, `CORS_ALLOWED_ORIGINS=https://tu-dominio`, `SMTP_*`, y añade `"443:443"` a `web.ports`. Caddy obtiene el certificado TLS solo. Programa copias de seguridad de los volúmenes `pgdata` y `media_*`.
