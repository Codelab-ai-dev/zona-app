// =====================================================
// ROUTER SERVICE
// =====================================================
// Clasifica la intención del usuario y determina el enfoque
// RAG (búsqueda vectorial) vs SQL (queries directas) vs Ambos
// =====================================================

import { Intent, UserIdentity } from '@/lib/types/agent.types';

interface IntentPattern {
  keywords: string[];
  weight: number; // Importancia de este patrón (1-10)
}

interface IntentClassification {
  intent: Intent;
  confidence: number; // 0.0 - 1.0
  entities: Record<string, any>;
  suggestedApproach: 'rag' | 'sql' | 'both';
  reasoning?: string; // Para debugging
}

export class RouterService {
  /**
   * Patrones de keywords por intención
   * Estructura: { intent: { keywords: [...], weight: number } }
   */
  private static readonly INTENT_PATTERNS: Record<Intent, IntentPattern[]> = {
    calendario: [
      { keywords: ['jornada', 'round', 'fecha'], weight: 10 },
      { keywords: ['cuando', 'cuándo', 'día', 'hora'], weight: 8 },
      { keywords: ['horario', 'calendario'], weight: 10 },
      { keywords: ['partidos', 'juegos', 'encuentros'], weight: 7 },
      { keywords: ['esta semana', 'próxima semana', 'fin de semana'], weight: 9 },
    ],

    resultados: [
      { keywords: ['resultado', 'resultados', 'marcador', 'marcadores'], weight: 15 },
      { keywords: ['ganó', 'ganaron', 'perdió', 'perdieron', 'empató', 'empataron'], weight: 9 },
      { keywords: ['goles', 'anotó', 'anotaron', 'metió'], weight: 8 },
      { keywords: ['cómo quedó', 'como quedo', 'cuánto quedó', 'como quedaron'], weight: 12 },
      { keywords: ['último partido', 'últimos partidos', 'score', 'scores'], weight: 8 },
    ],

    proximos_partidos: [
      { keywords: ['próximo', 'proximo', 'siguiente'], weight: 10 },
      { keywords: ['jugará', 'jugara', 'juega', 'jugar'], weight: 9 },
      { keywords: ['contra', 'vs', 'versus'], weight: 8 },
      { keywords: ['cuando juega', 'cuándo juega'], weight: 10 },
    ],

    tabla_posiciones: [
      { keywords: ['tabla', 'posiciones'], weight: 10 },
      { keywords: ['puntaje', 'puntos', 'puntuación'], weight: 9 },
      { keywords: ['primero', 'segundo', 'tercero', 'líder', 'lider'], weight: 8 },
      { keywords: ['clasificación', 'ranking'], weight: 9 },
      { keywords: ['quién va ganando', 'quien va ganando'], weight: 10 },
    ],

    suspensiones: [
      { keywords: ['suspendido', 'suspendidos', 'sancionado', 'sancionados'], weight: 10 },
      { keywords: ['tarjeta', 'tarjetas', 'roja', 'rojas', 'amarilla', 'amarillas'], weight: 9 },
      { keywords: ['expulsado', 'expulsados'], weight: 10 },
      { keywords: ['castigado', 'castigados'], weight: 8 },
      { keywords: ['no puede jugar', 'baja'], weight: 7 },
    ],

    estadisticas: [
      { keywords: ['estadística', 'estadisticas', 'stats'], weight: 10 },
      { keywords: ['goleador', 'goleadores', 'máximo goleador'], weight: 9 },
      { keywords: ['asistencias', 'asistidor'], weight: 8 },
      { keywords: ['mejor', 'peor'], weight: 6 },
    ],

    reglamento: [
      { keywords: ['regla', 'reglas', 'reglamento'], weight: 10 },
      { keywords: ['norma', 'normas'], weight: 9 },
      { keywords: ['permitido', 'permitir', 'prohibido'], weight: 7 },
      { keywords: ['cómo funciona', 'como funciona'], weight: 8 },
    ],

    pagos: [
      { keywords: ['pago', 'pagos', 'cuota', 'inscripción'], weight: 10 },
      { keywords: ['debo', 'adeudo', 'deuda'], weight: 9 },
      { keywords: ['costo', 'precio', 'cuánto cuesta'], weight: 8 },
    ],

    informacion_general: [
      { keywords: ['información', 'informacion', 'info'], weight: 8 },
      { keywords: ['qué es', 'que es', 'cuál es', 'cual es'], weight: 7 },
      { keywords: ['dónde', 'donde', 'ubicación'], weight: 7 },
      { keywords: ['contacto', 'teléfono', 'email'], weight: 8 },
    ],

    conversacion: [
      { keywords: ['hola', 'buenos días', 'buenas tardes', 'buenas noches'], weight: 10 },
      { keywords: ['gracias', 'thank', 'ok', 'perfecto'], weight: 8 },
      { keywords: ['ayuda', 'help', 'qué puedes hacer', 'que puedes hacer'], weight: 9 },
    ],

    unknown: [],
  };

  /**
   * Enfoque sugerido por intención
   *
   * RAG (embeddings) es más efectivo para datos de partidos/jornadas
   * porque contiene información pre-procesada y contextualizada
   */
  private static readonly INTENT_APPROACH: Record<Intent, 'rag' | 'sql' | 'both'> = {
    calendario: 'rag',              // Embeddings tienen info de jornadas
    resultados: 'both',             // SQL para scores + RAG para contexto
    proximos_partidos: 'rag',       // Embeddings tienen calendario
    tabla_posiciones: 'both',       // RAG + SQL para standings
    suspensiones: 'sql',            // Query a player_suspensions
    estadisticas: 'both',           // RAG + SQL
    reglamento: 'rag',              // Contenido textual
    pagos: 'rag',                   // Info general
    informacion_general: 'rag',     // Contenido general
    conversacion: 'rag',            // Sin data específica
    unknown: 'rag',                 // Por defecto RAG
  };

  /**
   * Clasifica la intención del mensaje del usuario
   *
   * Estrategia:
   * 1. Normaliza el texto (lowercase, acentos)
   * 2. Busca keywords de cada intención
   * 3. Calcula score por intención (suma de weights de keywords encontrados)
   * 4. Retorna intención con mayor score si supera threshold
   * 5. Extrae entidades relevantes (equipo, jornada, fecha)
   *
   * @param message - Mensaje del usuario
   * @param identity - Identidad del usuario (para contexto)
   * @returns Clasificación de intención
   */
  static async classifyIntent(
    message: string,
    identity: UserIdentity
  ): Promise<IntentClassification> {
    // Normalizar mensaje
    const normalizedMessage = this.normalizeText(message);

    // Calcular scores por intención
    const scores: Record<Intent, number> = {} as any;

    for (const [intent, patterns] of Object.entries(this.INTENT_PATTERNS)) {
      scores[intent as Intent] = this.calculateIntentScore(
        normalizedMessage,
        patterns
      );
    }

    // Encontrar intención con mayor score
    let maxScore = 0;
    let detectedIntent: Intent = 'unknown';

    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedIntent = intent as Intent;
      }
    }

    // Threshold: si el score es muy bajo, marcar como unknown
    const CONFIDENCE_THRESHOLD = 5; // Score mínimo para considerar válido
    if (maxScore < CONFIDENCE_THRESHOLD) {
      detectedIntent = 'unknown';
    }

    // Calcular confidence (normalizado 0-1)
    const confidence = Math.min(maxScore / 20, 1.0); // Score max ~20-30

    // Extraer entidades
    const entities = this.extractEntities(normalizedMessage, detectedIntent);

    // Determinar enfoque
    const suggestedApproach = this.INTENT_APPROACH[detectedIntent];

    console.log(`🎯 Intent: ${detectedIntent} (confidence: ${confidence.toFixed(2)}, approach: ${suggestedApproach})`);
    console.log(`📊 Scores:`, scores);

    return {
      intent: detectedIntent,
      confidence,
      entities,
      suggestedApproach,
      reasoning: `Detected from keywords with score ${maxScore.toFixed(1)}`,
    };
  }

  /**
   * Calcula el score de una intención basado en keywords
   */
  private static calculateIntentScore(
    message: string,
    patterns: IntentPattern[]
  ): number {
    let score = 0;

    for (const pattern of patterns) {
      // Buscar cualquier keyword del patrón
      const found = pattern.keywords.some(keyword =>
        message.includes(keyword.toLowerCase())
      );

      if (found) {
        score += pattern.weight;
      }
    }

    return score;
  }

  /**
   * Extrae entidades del mensaje según la intención
   *
   * Entidades comunes:
   * - team_name: Nombre del equipo mencionado
   * - jornada: Número de jornada (1-20)
   * - date: Fecha mencionada (hoy, mañana, etc.)
   * - player_name: Nombre de jugador
   */
  static extractEntities(
    message: string,
    intent: Intent
  ): Record<string, any> {
    const normalized = this.normalizeText(message);
    const entities: Record<string, any> = {};

    // Extraer número de jornada
    const jornadaMatch = normalized.match(/jornada\s*(\d+)/);
    if (jornadaMatch) {
      entities.jornada = parseInt(jornadaMatch[1], 10);
    }

    // Extraer referencias temporales
    if (normalized.includes('hoy')) {
      entities.date = 'today';
    } else if (normalized.includes('mañana') || normalized.includes('manana')) {
      entities.date = 'tomorrow';
    } else if (normalized.includes('esta semana')) {
      entities.date = 'this_week';
    } else if (normalized.includes('próxima semana') || normalized.includes('proxima semana')) {
      entities.date = 'next_week';
    }

    // Extraer equipo mencionado (básico, puede mejorarse con NER)
    // Nota: En producción, usar lista de equipos de la liga
    const teamPatterns = [
      /equipo\s+([a-záéíóúñ\s]+)/,
      /contra\s+([a-záéíóúñ\s]+)/,
      /vs\s+([a-záéíóúñ\s]+)/,
    ];

    for (const pattern of teamPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        entities.team_name = match[1].trim();
        break;
      }
    }

    return entities;
  }

  /**
   * Normaliza texto para matching
   * - Lowercase
   * - Elimina acentos
   * - Elimina puntuación extra
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[¿?¡!]/g, '') // Eliminar signos de interrogación/exclamación
      .trim();
  }

  /**
   * Valida si una intención requiere contexto de liga
   *
   * @param intent - Intención a validar
   * @returns true si requiere league_id
   */
  static requiresLeagueContext(intent: Intent): boolean {
    const requiresContext: Intent[] = [
      'calendario',
      'resultados',
      'proximos_partidos',
      'tabla_posiciones',
      'suspensiones',
      'estadisticas',
    ];

    return requiresContext.includes(intent);
  }

  /**
   * Determina si una intención necesita permisos especiales
   *
   * @param intent - Intención a verificar
   * @returns Permiso requerido o null
   */
  static getRequiredPermission(intent: Intent): string | null {
    const permissionMap: Partial<Record<Intent, string>> = {
      pagos: 'view_payments',
      // Agregar más según necesidad
    };

    return permissionMap[intent] || null;
  }

  /**
   * Sugiere preguntas de seguimiento basadas en la intención
   *
   * @param intent - Intención detectada
   * @returns Array de preguntas sugeridas
   */
  static suggestFollowUpQuestions(intent: Intent): string[] {
    const suggestions: Record<Intent, string[]> = {
      calendario: [
        '¿Cuándo juega mi equipo?',
        '¿Qué partidos hay mañana?',
        'Muéstrame la jornada 5',
      ],
      resultados: [
        '¿Qué resultados hubo ayer?',
        '¿Cómo quedó el último partido de [equipo]?',
        'Muéstrame los resultados de la jornada 3',
      ],
      tabla_posiciones: [
        '¿Quién va primero?',
        '¿Cuál es la posición de [equipo]?',
        'Muéstrame la tabla completa',
      ],
      suspensiones: [
        '¿Quiénes están suspendidos?',
        '¿Cuántas tarjetas tiene [jugador]?',
      ],
      // ... más intenciones
      conversacion: [
        '¿Qué puedes hacer?',
        '¿Cómo funciona esto?',
      ],
      unknown: [
        'Puedo ayudarte con: calendario, resultados, tabla de posiciones...',
      ],
      estadisticas: [],
      reglamento: [],
      pagos: [],
      informacion_general: [],
      proximos_partidos: [],
    };

    return suggestions[intent] || [];
  }

  /**
   * Mejora el mensaje del usuario para mejor procesamiento
   * Expande abreviaciones, corrige errores comunes
   *
   * @param message - Mensaje original
   * @returns Mensaje mejorado
   */
  static enhanceMessage(message: string): string {
    let enhanced = message;

    // Expandir abreviaciones
    const abbreviations: Record<string, string> = {
      'q': 'que',
      'k': 'que',
      'pq': 'porque',
      'xq': 'porque',
      'tmb': 'también',
      'tb': 'también',
      'vs': 'versus',
    };

    for (const [abbr, full] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      enhanced = enhanced.replace(regex, full);
    }

    // Corregir errores comunes
    enhanced = enhanced
      .replace(/q partidos/gi, 'qué partidos')
      .replace(/cuando juega/gi, 'cuándo juega')
      .replace(/como quedo/gi, 'cómo quedó');

    return enhanced;
  }
}
