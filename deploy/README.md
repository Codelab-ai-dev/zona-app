# Despliegue de Zona Gol

Un solo stack para local y para el VPS: **Caddy** (sirve la web y hace de proxy de `/api`, TLS automático en producción) → **API Go** → **Postgres** (pgvector).

## Local

```sh
make up      # crea deploy/.env con secretos aleatorios, compila, arranca y carga la demo
```

Abre http://localhost:8088. Cuentas de demo (contraseña: `SEED_PASSWORD` en `deploy/.env`):

| Rol | Correo |
| --- | --- |
| Super admin | superadmin@zonagol.local |
| Admin de liga | liga@zonagol.local |
| Dueño de equipo | equipo@zonagol.local |

Otros comandos: `make logs` (los correos de recuperación de contraseña aparecen aquí), `make ps`, `make down`, `make reset` (borra la base).

Sin `S3_*`, `KAPSO_*`, `MUX_*` ni `LLM_*` en `deploy/.env`, esos módulos quedan desactivados (subida de archivos, WhatsApp, video y asistente IA).

## Producción (VPS)

1. `make env` y edita `deploy/.env`: `APP_ENV=production`, `APP_URL=https://tu-dominio`, `SITE_ADDRESS=tu-dominio`, `HTTP_BIND=0.0.0.0:80`, `CORS_ALLOWED_ORIGINS=https://tu-dominio`, `SMTP_*` y las integraciones. Borra `SEED_PASSWORD`.
2. Publica también el 443 (añade `"443:443"` a `web.ports`) y apunta el DNS al VPS.
3. `docker compose -f deploy/compose.yml --env-file deploy/.env up -d --build`.

## Corte desde Supabase

Con el stack recién creado (base vacía y migrada):

```sh
SOURCE_DATABASE_URL='postgresql://postgres:…@db.<ref>.supabase.co:5432/postgres' ./deploy/import-from-supabase.sh
```

Copia `auth.users` (con sus hashes bcrypt: nadie cambia de contraseña) y los datos de `public` en una sola transacción. **Antes**, compara el esquema de producción (`pg_dump --schema-only`) con `backend/migrations`: si difieren, la carga falla y no se aplica nada.
