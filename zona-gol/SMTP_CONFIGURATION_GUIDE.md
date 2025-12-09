# Guía de Configuración SMTP para Supabase en Coolify

## 🚨 Problema Actual

El sistema de recuperación de contraseña **requiere que Supabase esté configurado con un servidor SMTP** para enviar correos electrónicos. En Supabase autoalojado (Coolify), esto no viene configurado por defecto.

## ✅ Solución: Configurar SMTP en Supabase

### Opción 1: Usar Gmail (Recomendado para desarrollo)

#### Paso 1: Configurar Gmail

1. Ve a tu cuenta de Gmail
2. Activa la verificación en 2 pasos
3. Genera una "Contraseña de aplicación":
   - Ve a: https://myaccount.google.com/apppasswords
   - Selecciona "Correo" y "Otro (nombre personalizado)"
   - Copia la contraseña generada (16 caracteres)

#### Paso 2: Configurar en Coolify

En Coolify, ve a tu servicio de Supabase y agrega estas variables de entorno:

```bash
# SMTP Configuration - Gmail
SMTP_ADMIN_EMAIL=tu-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion
SMTP_SENDER_NAME=Zona Gol

# Habilitar emails
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
MAILER_AUTOCONFIRM=false
```

#### Paso 3: Reiniciar Supabase

```bash
# En Coolify, reinicia el contenedor de Supabase
```

---

### Opción 2: Usar SendGrid (Recomendado para producción)

#### Paso 1: Crear cuenta en SendGrid

1. Registrarse en https://sendgrid.com
2. Verificar tu correo
3. Crear una API Key:
   - Settings → API Keys → Create API Key
   - Copiar la API key generada

#### Paso 2: Configurar en Coolify

```bash
# SMTP Configuration - SendGrid
SMTP_ADMIN_EMAIL=noreply@tu-dominio.com
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=tu-sendgrid-api-key
SMTP_SENDER_NAME=Zona Gol
```

---

### Opción 3: Usar Resend (Moderno y simple)

#### Paso 1: Crear cuenta en Resend

1. Registrarse en https://resend.com
2. Verificar dominio (opcional)
3. Crear API Key

#### Paso 2: Configurar SMTP

```bash
# SMTP Configuration - Resend
SMTP_ADMIN_EMAIL=onboarding@resend.dev
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=tu-resend-api-key
SMTP_SENDER_NAME=Zona Gol
```

---

### Opción 4: Servidor SMTP Propio

Si tienes tu propio servidor SMTP:

```bash
SMTP_ADMIN_EMAIL=admin@tu-dominio.com
SMTP_HOST=smtp.tu-dominio.com
SMTP_PORT=587  # o 465 para SSL
SMTP_USER=tu-usuario
SMTP_PASS=tu-contraseña
SMTP_SENDER_NAME=Zona Gol
```

---

## 📧 Configurar Templates de Email

### Personalizar el Email de Recuperación

En Coolify, agrega estas variables para personalizar los emails:

```bash
# Email Templates
MAILER_URLPATHS_CONFIRMATION=/auth/confirm
MAILER_URLPATHS_INVITE=/auth/invite
MAILER_URLPATHS_RECOVERY=/reset-password
MAILER_URLPATHS_EMAIL_CHANGE=/auth/email-change

# Site URL (tu dominio)
SITE_URL=https://zona-gol.com
PUBLIC_SITE_URL=https://zona-gol.com
```

---

## 🧪 Probar la Configuración

### Desde la UI

1. Ve a login: `https://zona-gol.com/login`
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa un email válido
4. Deberías recibir un correo

### Desde la Consola de Supabase

1. Ve al panel de Supabase: `https://api.zona-gol.com`
2. Authentication → Email Templates
3. Envía un email de prueba

### Logs para Debugging

Ver logs en Coolify:

```bash
# Ver logs del contenedor de Supabase Auth
docker logs nombre-contenedor-supabase-auth
```

Buscar por errores como:
- `SMTP connection failed`
- `Invalid credentials`
- `Could not send email`

---

## 🔍 Troubleshooting

### Error: "SMTP not configured"

**Solución:**
1. Verificar que las variables SMTP estén configuradas
2. Reiniciar el contenedor de Supabase
3. Verificar logs para ver errores específicos

### Error: "Authentication failed"

**Solución:**
1. Verificar credenciales SMTP
2. Para Gmail: usar contraseña de aplicación (no la contraseña normal)
3. Verificar que el usuario SMTP sea correcto

### El correo no llega

**Solución:**
1. Revisar carpeta de spam
2. Verificar que el email del remitente esté verificado
3. Revisar logs de Supabase
4. Probar con otro servicio SMTP

### Error: "Connection timeout"

**Solución:**
1. Verificar que el puerto SMTP sea correcto (587 o 465)
2. Verificar firewall/seguridad de red
3. Probar con otro puerto

---

## 📝 Variables de Entorno Completas

Aquí está la configuración completa recomendada:

```bash
# Supabase Core
SUPABASE_URL=https://api.zona-gol.com
SITE_URL=https://zona-gol.com
PUBLIC_SITE_URL=https://zona-gol.com

# SMTP (ejemplo con Gmail)
SMTP_ADMIN_EMAIL=tu-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion-16-caracteres
SMTP_SENDER_NAME=Zona Gol

# Email Settings
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
MAILER_AUTOCONFIRM=false

# Email Templates URLs
MAILER_URLPATHS_CONFIRMATION=/auth/confirm
MAILER_URLPATHS_INVITE=/auth/invite
MAILER_URLPATHS_RECOVERY=/reset-password
MAILER_URLPATHS_EMAIL_CHANGE=/auth/email-change

# Security
MAILER_SECURE_EMAIL_CHANGE_ENABLED=true
SECURITY_CAPTCHA_ENABLED=false
```

---

## 🚀 Implementación en Coolify

### Paso a Paso

1. **Acceder a Coolify**
   ```
   https://tu-coolify-instance.com
   ```

2. **Ir a tu proyecto Supabase**
   - Services → Supabase

3. **Configurar Variables de Entorno**
   - Environment Variables
   - Agregar todas las variables SMTP de arriba

4. **Reiniciar el Servicio**
   - Click en "Restart"
   - Esperar a que el servicio se reinicie completamente

5. **Verificar**
   - Probar el login
   - Intentar recuperar contraseña
   - Revisar logs

---

## ⚠️ Notas Importantes

1. **Gmail tiene límites**: 500 emails/día para cuentas gratuitas
2. **SendGrid es mejor para producción**: Hasta 100 emails/día gratis
3. **Verificar dominio**: Para mejor deliverability en producción
4. **SPF/DKIM**: Configurar para evitar spam
5. **Templates**: Personalizar en Supabase dashboard

---

## 📚 Referencias

- [Supabase SMTP Configuration](https://supabase.com/docs/guides/self-hosting/docker#configuring-email)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SendGrid Setup](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)
- [Resend Documentation](https://resend.com/docs/send-with-smtp)

---

## 🆘 Soporte Alternativo

Si no puedes configurar SMTP inmediatamente, hay una solución temporal:

### Reseteo Manual de Contraseña (Solo Admin)

El administrador puede resetear contraseñas directamente desde el panel de Supabase:

1. Ir a: `https://api.zona-gol.com/project/default/auth/users`
2. Buscar el usuario
3. Click en usuario → "Reset Password"
4. Copiar el link generado
5. Enviarlo manualmente al usuario

---

**Última actualización:** $(date +%Y-%m-%d)  
**Estado:** Pendiente de configuración SMTP
