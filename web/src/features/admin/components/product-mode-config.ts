import type { FeatureKey, ProductMode } from '../types'

/** Plans of the original app: label, price and the flags each one turns on. */
export const PRODUCT_MODE_CONFIG: Record<
  ProductMode,
  { label: string; description: string; price: string; icon: string; features: Record<FeatureKey, boolean> }
> = {
  full: {
    label: 'Zona-G Completo',
    description: 'Sistema completo con app móvil, códigos QR, reconocimiento facial y actualizaciones en tiempo real',
    price: '$999 MXN/mes',
    icon: '🏆',
    features: {
      qr_codes: true,
      facial_recognition: true,
      mobile_app: true,
      realtime_updates: true,
      manual_entry: true,
      public_portal: true,
      statistics: true,
      ai_agent: true,
      finance: true,
      finance_auto_fines: true,
      finance_payments: true,
    },
  },
  web_only: {
    label: 'Zona-G Web',
    description: 'Portal web con captura manual de datos, ideal para ligas sin necesidad de app móvil',
    price: '$499 MXN/mes',
    icon: '🌐',
    features: {
      qr_codes: false,
      facial_recognition: false,
      mobile_app: false,
      realtime_updates: false,
      manual_entry: true,
      public_portal: true,
      statistics: true,
      ai_agent: true,
      finance: true,
      finance_auto_fines: false,
      finance_payments: false,
    },
  },
}

export const PRODUCT_FEATURE_LABELS: Record<FeatureKey, string> = {
  qr_codes: 'Códigos QR',
  facial_recognition: 'Reconocimiento Facial',
  mobile_app: 'App Móvil',
  realtime_updates: 'Actualizaciones en Tiempo Real',
  manual_entry: 'Captura Manual',
  public_portal: 'Portal Público',
  statistics: 'Estadísticas Avanzadas',
  ai_agent: 'Agente AI por WhatsApp',
  finance: 'Gestión Financiera',
  finance_auto_fines: 'Multas Automáticas',
  finance_payments: 'Pagos en Línea',
}
