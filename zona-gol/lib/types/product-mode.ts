/**
 * Product Mode Types
 *
 * Defines the different product tiers and their features
 */

export type ProductMode = 'full' | 'web_only'

export interface LeagueFeatures {
  qr_codes: boolean
  facial_recognition: boolean
  mobile_app: boolean
  realtime_updates: boolean
  manual_entry: boolean
  public_portal: boolean
  statistics: boolean
  ai_agent: boolean
}

export interface LeagueWithMode {
  id: string
  name: string
  slug: string
  product_mode: ProductMode
  features: LeagueFeatures
  mode_updated_at?: string | null
  mode_updated_by?: string | null
}

export const PRODUCT_MODE_CONFIG: Record<ProductMode, {
  label: string
  description: string
  price: string
  features: LeagueFeatures
  icon: string
}> = {
  full: {
    label: 'Zona-G Completo',
    description: 'Sistema completo con app móvil, códigos QR, reconocimiento facial y actualizaciones en tiempo real',
    price: '$999 MXN/mes',
    features: {
      qr_codes: true,
      facial_recognition: true,
      mobile_app: true,
      realtime_updates: true,
      manual_entry: true,
      public_portal: true,
      statistics: true,
      ai_agent: true,
    },
    icon: '🏆',
  },
  web_only: {
    label: 'Zona-G Web',
    description: 'Portal web con captura manual de datos, ideal para ligas sin necesidad de app móvil',
    price: '$499 MXN/mes',
    features: {
      qr_codes: false,
      facial_recognition: false,
      mobile_app: false,
      realtime_updates: false,
      manual_entry: true,
      public_portal: true,
      statistics: true,
      ai_agent: true,
    },
    icon: '🌐',
  },
}

export const FEATURE_LABELS: Record<keyof LeagueFeatures, string> = {
  qr_codes: 'Códigos QR',
  facial_recognition: 'Reconocimiento Facial',
  mobile_app: 'App Móvil',
  realtime_updates: 'Actualizaciones en Tiempo Real',
  manual_entry: 'Captura Manual',
  public_portal: 'Portal Público',
  statistics: 'Estadísticas Avanzadas',
  ai_agent: 'Agente AI por WhatsApp',
}

export const FEATURE_DESCRIPTIONS: Record<keyof LeagueFeatures, string> = {
  qr_codes: 'Genera códigos QR para registro de asistencia rápido',
  facial_recognition: 'Reconocimiento facial automático de jugadores',
  mobile_app: 'Acceso a la app móvil Zona-G para árbitros y staff',
  realtime_updates: 'Sincronización en tiempo real de partidos y estadísticas',
  manual_entry: 'Captura manual de resultados y estadísticas',
  public_portal: 'Portal web público con tablas de posiciones y calendario',
  statistics: 'Estadísticas detalladas de jugadores y equipos',
  ai_agent: 'Consultas por WhatsApp sobre partidos y estadísticas',
}
