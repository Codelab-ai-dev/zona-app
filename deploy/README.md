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

Crea dos ligas independientes con jugadores y partidos, y una jornada programada para hoy en cada una: la Liga Demo Zona Gol (6 equipos; cuentas `liga@zonagol.local` y `equipo@zonagol.local`) y la Liga Ensayo B (4 equipos; cuentas `liga-b@zonagol.local` y `equipo-b@zonagol.local`), más `superadmin@zonagol.local`. Todas usan la contraseña `SEED_PASSWORD` de `deploy/.env`. Si una liga ya existe la deja como está, así que en una instalación previa solo agrega la Liga Ensayo B. El ensayo de jornada que usa estos datos está en [`docs/operations/ENSAYO_JORNADA.md`](../docs/operations/ENSAYO_JORNADA.md).

## Comandos

| Comando | Para qué |
| --- | --- |
| `make up` | Compila y arranca (o actualiza tras cambios en el código). |
| `make logs` | Logs de la API y de Caddy. Los correos de recuperación de contraseña aparecen aquí mientras no haya SMTP. |
| `make ps` | Estado de los contenedores. |
| `make down` | Detiene todo (los datos se conservan). |
| `make backup` | Copia la base de datos y los archivos subidos en `backups/<fecha>/`. |
| `make restore FROM=backups/<fecha>` | **Reemplaza** los datos actuales por una copia (pide confirmación y verifica que no esté dañada). |
| `make reset` | Detiene todo y **borra** la base de datos y los archivos. |

## Copias de seguridad

`make backup` guarda en `backups/<fecha>/` un volcado de la base (`db.dump`), los archivos públicos y los privados (`.tar.gz`) y sus sumas SHA-256. Contienen datos personales (incluidos documentos de identidad): se crean con permisos solo para tu usuario, `backups/` no se sube a git, y conviene guardar una copia fuera de esta máquina.

## Integraciones opcionales

Se activan añadiendo sus variables a `deploy/.env` (lista completa en `backend/.env.example`): `SMTP_*` (correo), `KAPSO_*` (WhatsApp), `MUX_*` (video), `LLM_*` y `OPENAI_API_KEY` (asistente IA). Sin ellas, esas funciones quedan desactivadas y el resto funciona.

## Más adelante: VPS

El mismo stack sirve en producción. En `deploy/.env`: `APP_ENV=production`, `APP_URL=https://tu-dominio`, `SITE_ADDRESS=tu-dominio`, `HTTP_BIND=0.0.0.0:80`, `CORS_ALLOWED_ORIGINS=https://tu-dominio`, `SMTP_*`, y añade `"443:443"` a `web.ports`. Caddy obtiene el certificado TLS solo. Programa `make backup` (por ejemplo con cron) y copia `backups/` fuera del servidor.
