"use server"

import { createClient } from '@supabase/supabase-js'

// Función helper para obtener el cliente de Supabase con service key
// Se crea de forma lazy para evitar errores durante el build
function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Solicita un restablecimiento de contraseña
 * Para Supabase autoalojado, necesitas configurar SMTP en el panel de Supabase
 */
export async function requestPasswordReset(email: string, redirectUrl: string) {
  try {
    const supabase = getSupabaseAdmin()

    // Verificar si el usuario existe
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      // Por seguridad, no revelamos si el email existe o no
      return {
        success: true,
        message: 'Si el correo existe, recibirás un enlace de recuperación.'
      }
    }

    // Usar el método de Supabase para enviar email de recuperación
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl
      }
    })

    if (resetError) {
      console.error('Error generando link de recuperación:', resetError)

      // Si falla el envío de email, podemos generar un token manual
      if (resetError.message.includes('SMTP') || resetError.message.includes('mail')) {
        return {
          success: false,
          error: 'El servidor de correo no está configurado. Por favor, contacta al administrador.',
          needsManualSetup: true
        }
      }

      return {
        success: false,
        error: resetError.message
      }
    }

    return {
      success: true,
      message: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña.'
    }
  } catch (error: any) {
    console.error('Error en requestPasswordReset:', error)
    return {
      success: false,
      error: error.message || 'Error al procesar la solicitud'
    }
  }
}

/**
 * Genera un token de recuperación manual (para cuando SMTP no está configurado)
 * NOTA: Este método debe usarse solo en desarrollo o para admin
 */
export async function generateManualResetToken(email: string) {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    })

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    // El link de recuperación está en data.properties.action_link
    return {
      success: true,
      recoveryLink: data.properties?.action_link,
      message: 'Token generado. Copia el link y úsalo para restablecer la contraseña.'
    }
  } catch (error: any) {
    console.error('Error generando token manual:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Actualiza la contraseña usando el token de recuperación
 */
export async function updatePasswordWithToken(accessToken: string, newPassword: string) {
  try {
    const supabase = getSupabaseAdmin()

    const { error } = await supabase.auth.admin.updateUserById(
      accessToken,
      { password: newPassword }
    )

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente'
    }
  } catch (error: any) {
    console.error('Error actualizando contraseña:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
