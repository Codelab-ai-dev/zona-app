# Configuración de Recuperación de Contraseña

La funcionalidad de "Olvidé mi contraseña" ya está implementada en el código del proyecto (`app/login` y `app/reset-password`), pero requiere configuración en tu panel de Supabase para funcionar correctamente.

Sigue estos pasos para activarla:

## 1. Configuración de URLs en Supabase

Para que el enlace de recuperación redirija correctamente a tu aplicación, debes configurar las URLs permitidas.

1.  Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2.  Navega a **Authentication** > **URL Configuration**.
3.  En **Site URL**, asegura que esté la URL principal de tu app (ej: `http://localhost:3000` para desarrollo).
4.  En **Redirect URLs**, añade las siguientes rutas:
    *   `http://localhost:3000/reset-password`
    *   `https://tu-dominio-produccion.com/reset-password` (cuando despliegues)
5.  Guarda los cambios.

## 2. Configuración de Email (SMTP)

Por defecto, Supabase tiene un límite muy estricto de emails (3 por hora). Para producción, **debes** configurar tu propio proveedor de SMTP (como Resend, SendGrid, AWS SES, o incluso Gmail para pruebas).

1.  Ve a **Project Settings** > **Authentication** > **SMTP Settings**.
2.  Activa **Enable Custom SMTP**.
3.  Ingresa los datos de tu proveedor.
    *   **Ejemplo con Resend (Recomendado):**
        *   Host: `smtp.resend.com`
        *   Port: `465` (SSL)
        *   User: `resend`
        *   Pass: `re_12345...` (tu API Key)
        *   Sender Email: `noreply@tu-dominio.com` (debe estar verificado en Resend)

## 3. Personalización del Template de Email

1.  Ve a **Authentication** > **Email Templates**.
2.  Selecciona **Reset Password**.
3.  Asegúrate de que el enlace en el cuerpo del correo use la variable `{{ .ConfirmationURL }}`.
    *   El código de la app envía la redirección automáticamente, así que el enlace generado por Supabase ya incluirá `?redirect_to=...`.

## 4. Probando el Flujo

1.  Ve a la página de Login.
2.  Haz click en "¿Olvidaste tu contraseña?".
3.  Ingresa tu correo y envía.
4.  Recibirás un correo. Al hacer clic en el enlace, deberías ser redirigido a la página de `/reset-password` en tu app.
5.  Ingresa la nueva contraseña y confirma.

## Solución de Problemas Comunes

*   **Error "SMTP not configured"**: Falta el paso 2.
*   **El enlace redirige al home en lugar de reset-password**: Verifica el paso 1 (Redirect URLs).
*   **Token expired**: El enlace de recuperación tiene una validez limitada (configura esto en Auth > Security > Password reset token validity).

# Configuración para Supabase Auto-alojado (Dokploy / VPS)

Si estás usando Dokploy o tu propia instancia de Supabase con Docker, la configuración no se hace desde un dashboard visual igual al de la nube, sino a través de **Variables de Entorno**.

## 1. Localiza tu servicio de Auth (GoTrue/Supabase Auth)

En Dokploy, busca el servicio correspondiente a la autenticación de Supabase (o edita el archivo `.env` o `docker-compose.yml` si lo gestionas manualmente).

## 2. Configura las Variables de Entorno

Debes agregar o modificar las siguientes variables para que funcionen los correos y las redirecciones:

### URLs del Sitio
*   `SITE_URL`: La URL principal de tu aplicación (ej: `https://tu-app.com`).
*   `URI_ALLOW_LIST`: La lista de URLs permitidas para redirección. **Es crítico incluir la ruta de reset**.
    *   Valor: `https://tu-app.com,https://tu-app.com/reset-password` (separadas por coma, sin espacios).

### Configuración SMTP
Para que los correos salgan de tu VPS, necesitas un servidor SMTP externo (Resend, SendGrid, etc.) o configurar el local.

*   `SMTP_HOST`: `smtp.resend.com` (o tu proveedor)
*   `SMTP_PORT`: `465` (usualmente)
*   `SMTP_USER`: `resend`
*   `SMTP_PASS`: `re_12345...` (tu API key)
*   `SMTP_ADMIN_EMAIL`: `admin@tu-dominio.com`
*   `SMTP_SENDER_NAME`: `Zona Gol`

## 3. Reiniciar Servicios

Después de guardar las variables en Dokploy, asegúrate de **redesplegar o reiniciar** el servicio de autenticación para que tome los cambios.

## 4. Verificar Logs

Si los correos no llegan, revisa los logs del contenedor de `auth` o `gotrue`. Ahí verás si hay errores de conexión con el servidor SMTP.

## Example Configuration (Corrections for your Dokploy)

Based on your provided file, here are the specific lines you need to change. I've detected you are using Resend (based on the `re_...` key).

```bash
## General
# IMPORTANT: SITE_URL should be your FRONTEND URL where users login, not the API
SITE_URL=https://zona-gol.com
# Add your reset password path here
ADDITIONAL_REDIRECT_URLS=https://zona-gol.com/reset-password,https://api.zona-gol.com
API_EXTERNAL_URL=https://api.zona-gol.com

## Mailer Config (RESEND specific settings)
SMTP_ADMIN_EMAIL=admin@zona-gol.com  <-- Change this to a verified email in Resend
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_h1YvNmgp_DPezv4uh6MXocnC5r82M49YQ
SMTP_SENDER_NAME=Zona-Gol
```

**Key Changes:**
1.  **SMTP Host/User/Port**: Changed to Resend's official settings.
2.  **Redirect URLs**: Added the frontend `reset-password` path so the link in the email works.
3.  **Site URL**: Should point to your actual website, not the API (usually).


