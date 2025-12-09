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
  },

  // Configuración estándar (20 minutos) - ACTUAL
  standard: {
    idleTimeout: 20 * 60 * 1000,
    idleWarningTime: 2 * 60 * 1000,
  },

  // Configuración relajada (60 minutos)
  relaxed: {
    idleTimeout: 60 * 60 * 1000,
    idleWarningTime: 5 * 60 * 1000,
  },

  // Solo para desarrollo (no usar en producción)
  development: {
    idleTimeout: 60 * 60 * 1000, // 1 hora
    idleWarningTime: 10 * 60 * 1000, // 10 minutos
  },
}
