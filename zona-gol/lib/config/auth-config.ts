/**
 * Configuración de autenticación y seguridad
 */

export const authConfig = {
  /**
   * Tiempo de inactividad antes de cerrar sesión automáticamente
   * Por defecto: 20 minutos (1200000 ms)
   */
  idleTimeout: 20 * 60 * 1000, // 20 minutos

  /**
   * Tiempo antes del cierre de sesión para mostrar advertencia
   * Por defecto: 2 minutos (120000 ms)
   */
  idleWarningTime: 2 * 60 * 1000, // 2 minutos

  /**
   * Intervalo para refrescar proactivamente el token de Supabase
   * mientras el usuario esté activo. Esto previene que el token
   * expire aunque el usuario esté trabajando.
   * Por defecto: 10 minutos (600000 ms)
   */
  tokenRefreshInterval: 10 * 60 * 1000, // 10 minutos

  /**
   * Eventos que se consideran como actividad del usuario
   */
  activityEvents: [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
  ],
}

/**
 * Configuraciones predefinidas para diferentes escenarios
 */
export const authPresets = {
  // Configuración de seguridad estricta (5 minutos)
  strict: {
    idleTimeout: 5 * 60 * 1000,
    idleWarningTime: 1 * 60 * 1000,
    tokenRefreshInterval: 2 * 60 * 1000, // Refrescar cada 2 minutos
  },

  // Configuración estándar (20 minutos) - ACTUAL
  standard: {
    idleTimeout: 20 * 60 * 1000,
    idleWarningTime: 2 * 60 * 1000,
    tokenRefreshInterval: 10 * 60 * 1000, // Refrescar cada 10 minutos
  },

  // Configuración relajada (60 minutos)
  relaxed: {
    idleTimeout: 60 * 60 * 1000,
    idleWarningTime: 5 * 60 * 1000,
    tokenRefreshInterval: 30 * 60 * 1000, // Refrescar cada 30 minutos
  },

  // Solo para desarrollo (no usar en producción)
  development: {
    idleTimeout: 60 * 60 * 1000, // 1 hora
    idleWarningTime: 10 * 60 * 1000, // 10 minutos
    tokenRefreshInterval: 30 * 60 * 1000, // Refrescar cada 30 minutos
  },
}
