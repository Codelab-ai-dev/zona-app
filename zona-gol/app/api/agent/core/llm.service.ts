// =====================================================
// LLM SERVICE
// =====================================================
// Genera respuestas naturales usando OpenAI Chat Completions API
// Combina contexto de RAG + SQL para respuestas informadas
// =====================================================

import { UserIdentity, RAGChunk, Intent } from '@/lib/types/agent.types';

/**
 * Mensaje de conversación
 */
interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Opciones para generación de respuesta
 */
interface GenerateResponseOptions {
  identity: UserIdentity;
  userMessage: string;
  intent: Intent;
  ragContext?: string;
  sqlContext?: string;
  conversationHistory?: ConversationMessage[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Resultado de generación LLM
 */
interface LLMResult {
  text: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
  finishReason: string;
  latencyMs: number;
}

/**
 * Precios por modelo (USD por 1K tokens)
 */
const MODEL_PRICING = {
  'gpt-4o-mini': {
    input: 0.00015, // $0.15 por 1M tokens
    output: 0.0006, // $0.60 por 1M tokens
  },
  'gpt-4o': {
    input: 0.0025, // $2.50 por 1M tokens
    output: 0.01, // $10.00 por 1M tokens
  },
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015,
  },
};

export class LLMService {
  // Modelo por defecto (cost-effective para producción)
  private static readonly DEFAULT_MODEL = 'gpt-4o-mini';
  private static readonly DEFAULT_TEMPERATURE = 0.7;
  private static readonly DEFAULT_MAX_TOKENS = 500;

  /**
   * Genera una respuesta usando OpenAI
   *
   * @param options - Opciones de generación
   * @returns Respuesta generada con metadata
   */
  static async generateResponse(
    options: GenerateResponseOptions
  ): Promise<LLMResult> {
    const startTime = Date.now();

    const {
      identity,
      userMessage,
      intent,
      ragContext,
      sqlContext,
      conversationHistory = [],
      temperature = this.DEFAULT_TEMPERATURE,
      maxTokens = this.DEFAULT_MAX_TOKENS,
    } = options;

    console.log(`🤖 LLM: Generating response for intent "${intent}"`);

    // Construir mensajes
    const messages: ConversationMessage[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(identity, intent),
      },
    ];

    // Agregar historial de conversación (últimos 5 mensajes)
    const recentHistory = conversationHistory.slice(-5);
    messages.push(...recentHistory);

    // Agregar contexto si existe
    if (ragContext || sqlContext) {
      const contextMessage = this.buildContextMessage(ragContext, sqlContext);
      messages.push({
        role: 'system',
        content: contextMessage,
      });
    }

    // Agregar mensaje del usuario
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Llamar a OpenAI
    try {
      const result = await this.callOpenAI(messages, {
        model: this.DEFAULT_MODEL,
        temperature,
        maxTokens,
      });

      const latencyMs = Date.now() - startTime;

      console.log(
        `✅ LLM: Generated response (${result.tokensUsed} tokens, $${result.costUsd.toFixed(4)}, ${latencyMs}ms)`
      );

      return {
        ...result,
        latencyMs,
      };
    } catch (error: any) {
      console.error('❌ LLM: Generation failed:', error);

      // Fallback a respuesta genérica
      return {
        text: this.getFallbackResponse(intent),
        model: this.DEFAULT_MODEL,
        tokensUsed: 0,
        costUsd: 0,
        finishReason: 'error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Llama a OpenAI Chat Completions API
   *
   * @param messages - Mensajes de conversación
   * @param options - Opciones de generación
   * @returns Resultado de la generación
   */
  private static async callOpenAI(
    messages: ConversationMessage[],
    options: {
      model: string;
      temperature: number;
      maxTokens: number;
    }
  ): Promise<Omit<LLMResult, 'latencyMs'>> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `OpenAI API error: ${error.error?.message || response.statusText}`
      );
    }

    const result = await response.json();

    if (!result.choices || result.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    const choice = result.choices[0];
    const text = choice.message.content;
    const finishReason = choice.finish_reason;

    // Calcular tokens y costo
    const promptTokens = result.usage?.prompt_tokens || 0;
    const completionTokens = result.usage?.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;

    const pricing = MODEL_PRICING[options.model as keyof typeof MODEL_PRICING] ||
                    MODEL_PRICING['gpt-4o-mini'];

    const costUsd =
      (promptTokens / 1000) * pricing.input +
      (completionTokens / 1000) * pricing.output;

    return {
      text,
      model: options.model,
      tokensUsed: totalTokens,
      costUsd,
      finishReason,
    };
  }

  /**
   * Construye el system prompt según la identidad y el intent
   *
   * @param identity - Identidad del usuario
   * @param intent - Intención detectada
   * @returns System prompt
   */
  private static buildSystemPrompt(
    identity: UserIdentity,
    intent: Intent
  ): string {
    const basePrompt = `Eres un asistente virtual para ligas de fútbol amateur en México.

**Tu misión:**
- Ayudar a los usuarios con información sobre su liga: partidos, resultados, tabla de posiciones, suspensiones, etc.
- Responder de manera clara, concisa y amigable en español mexicano
- Usar lenguaje casual pero profesional
- Si no tienes información suficiente, ser honesto y sugerir alternativas

**Contexto del usuario:**
- Nombre: ${identity.displayName || 'Usuario'}
- Rol: ${this.getRoleDescription(identity.role)}
- Canal: ${identity.channel === 'whatsapp' ? 'WhatsApp' : identity.channel}

**Intención detectada:** ${intent}

**Instrucciones específicas:**
${this.getIntentSpecificInstructions(intent)}

**Tono:**
${this.getToneGuidelines(identity.role)}

**IMPORTANTE:**
- Mantén respuestas cortas (máximo 3-4 párrafos)
- Usa emojis ocasionalmente para ser amigable (⚽ 🏆 📅 ⚠️)
- No inventes información - usa solo lo que te proporciono
- Si falta información, ofrece ayudar con otra consulta`;

    return basePrompt;
  }

  /**
   * Obtiene descripción del rol para el prompt
   */
  private static getRoleDescription(role?: string): string {
    const descriptions: Record<string, string> = {
      super_admin: 'Super Administrador (acceso completo)',
      league_admin: 'Administrador de Liga',
      team_owner: 'Dueño de Equipo',
      public: 'Usuario Público',
      user: 'Usuario',
    };

    return descriptions[role || 'public'] || 'Usuario';
  }

  /**
   * Obtiene instrucciones específicas según el intent
   */
  private static getIntentSpecificInstructions(intent: Intent): string {
    const instructions: Record<Intent, string> = {
      calendario: `
- Presenta los partidos de manera clara con fecha, hora y equipos
- Si es una jornada completa, agrupa por fecha
- Menciona si hay partidos pendientes de programar
      `,
      resultados: `
- Muestra los resultados con el marcador destacado
- Menciona datos relevantes (goleadores si están disponibles)
- Si hay tendencias, menciόnalas brevemente
      `,
      proximos_partidos: `
- Enfócate en los próximos 3-5 partidos del equipo
- Incluye fecha, hora y rival
- Si hay información del estado del equipo, menciónala
      `,
      tabla_posiciones: `
- Presenta la tabla de forma clara (top 5 si es larga)
- Destaca la posición del equipo del usuario si es aplicable
- Menciona datos interesantes (líder, lucha por el título, descenso)
      `,
      suspensiones: `
- Lista claramente quién está suspendido y hasta cuándo
- Menciona la razón si está disponible
- Si no hay suspensiones, responde positivamente
      `,
      estadisticas: `
- Presenta las estadísticas de manera clara
- Enfócate en los top 3-5 jugadores
- Usa comparaciones si son interesantes
      `,
      reglamento: `
- Explica las reglas de manera clara y simple
- Usa ejemplos si ayuda a entender
- Si no tienes la información exacta, sé honesto
      `,
      pagos: `
- Sé preciso con información de pagos
- Menciona fechas límite si están disponibles
- Sugiere contactar al administrador si es necesario
      `,
      informacion_general: `
- Responde de manera informativa pero concisa
- Si la información no está disponible, sugiere dónde encontrarla
      `,
      conversacion: `
- Responde de manera amigable y natural
- Ofrece ayuda con las funciones disponibles
- Mantén una conversación casual pero útil
      `,
      unknown: `
- Intenta entender qué necesita el usuario
- Sugiere opciones de ayuda
- Sé amable y paciente
      `,
    };

    return instructions[intent] || 'Responde de la mejor manera posible.';
  }

  /**
   * Obtiene guidelines de tono según el rol
   */
  private static getToneGuidelines(role?: string): string {
    if (role === 'super_admin' || role === 'league_admin') {
      return 'Profesional pero accesible. Puedes incluir detalles técnicos si son relevantes.';
    }

    if (role === 'team_owner') {
      return 'Amigable y servicial. Enfócate en información relevante para su equipo.';
    }

    return 'Casual y amigable. Usa lenguaje simple y directo.';
  }

  /**
   * Construye mensaje de contexto con información de RAG y SQL
   *
   * @param ragContext - Contexto de RAG
   * @param sqlContext - Contexto de SQL
   * @returns Mensaje de contexto
   */
  private static buildContextMessage(
    ragContext?: string,
    sqlContext?: string
  ): string {
    let context = 'INFORMACIÓN DISPONIBLE:\n\n';

    if (sqlContext) {
      context += '**Datos estructurados:**\n';
      context += sqlContext;
      context += '\n\n';
    }

    if (ragContext) {
      context += '**Contexto adicional:**\n';
      context += ragContext;
      context += '\n\n';
    }

    context +=
      'Usa esta información para responder la pregunta del usuario. Si la información es insuficiente, sé honesto.';

    return context;
  }

  /**
   * Obtiene respuesta de fallback según el intent
   *
   * @param intent - Intención detectada
   * @returns Respuesta genérica
   */
  private static getFallbackResponse(intent: Intent): string {
    const fallbacks: Record<Intent, string> = {
      calendario:
        'Lo siento, no pude obtener el calendario en este momento. ¿Podrías intentar de nuevo o especificar qué jornada te interesa?',
      resultados:
        'No pude obtener los resultados ahora. ¿Podrías intentar de nuevo?',
      proximos_partidos:
        'No encontré información sobre próximos partidos en este momento. ¿Podrías verificar el nombre del equipo?',
      tabla_posiciones:
        'No pude obtener la tabla de posiciones. Intenta de nuevo en unos momentos.',
      suspensiones:
        'No tengo información sobre suspensiones en este momento.',
      estadisticas:
        'No pude obtener las estadísticas. ¿Podrías ser más específico?',
      reglamento:
        'No encontré información sobre esa regla. Te sugiero contactar al administrador de la liga.',
      pagos:
        'Para información sobre pagos, te recomiendo contactar directamente al administrador de la liga.',
      informacion_general:
        'No tengo esa información disponible. ¿Hay algo más en lo que pueda ayudarte?',
      conversacion:
        '¡Hola! Puedo ayudarte con información sobre partidos, resultados, tabla de posiciones y más. ¿Qué necesitas?',
      unknown:
        'No estoy seguro de qué necesitas. Puedo ayudarte con:\n- Calendario de partidos\n- Resultados\n- Tabla de posiciones\n- Suspensiones\n- Estadísticas\n\n¿Qué te gustaría saber?',
    };

    return fallbacks[intent] || 'Lo siento, algo salió mal. ¿Podrías intentar de nuevo?';
  }

  /**
   * Genera un resumen de conversación para contexto
   *
   * @param messages - Mensajes de la conversación
   * @returns Resumen
   */
  static summarizeConversation(
    messages: ConversationMessage[]
  ): string {
    if (messages.length === 0) {
      return 'Nueva conversación.';
    }

    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');

    let summary = `Conversación con ${userMessages.length} mensajes del usuario.\n`;

    if (userMessages.length > 0) {
      summary += `Último mensaje: "${userMessages[userMessages.length - 1].content.substring(0, 50)}..."`;
    }

    return summary;
  }

  /**
   * Valida que una respuesta sea apropiada
   *
   * @param text - Texto de respuesta
   * @returns true si es válida
   */
  static validateResponse(text: string): {
    isValid: boolean;
    issues?: string[];
  } {
    const issues: string[] = [];

    // Muy corta
    if (text.length < 10) {
      issues.push('Response too short');
    }

    // Muy larga (para WhatsApp)
    if (text.length > 2000) {
      issues.push('Response too long for WhatsApp (max 2000 chars)');
    }

    // Contiene URLs sospechosas
    if (text.match(/https?:\/\//gi)) {
      issues.push('Contains URLs');
    }

    // Menciona que es una IA (queremos que sea natural)
    if (text.toLowerCase().includes('como ia') || text.toLowerCase().includes('soy un modelo')) {
      issues.push('Mentions being an AI');
    }

    return {
      isValid: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Estima el costo de una generación antes de ejecutarla
   *
   * @param promptLength - Longitud aproximada del prompt en caracteres
   * @param maxTokens - Máximo de tokens de respuesta
   * @returns Costo estimado en USD
   */
  static estimateCost(
    promptLength: number,
    maxTokens: number = this.DEFAULT_MAX_TOKENS
  ): number {
    // Estimación aproximada: 1 token ≈ 4 caracteres
    const estimatedPromptTokens = Math.ceil(promptLength / 4);
    const estimatedCompletionTokens = maxTokens;

    const pricing = MODEL_PRICING[this.DEFAULT_MODEL];

    return (
      (estimatedPromptTokens / 1000) * pricing.input +
      (estimatedCompletionTokens / 1000) * pricing.output
    );
  }

  /**
   * Health check del servicio LLM
   *
   * @returns Estado del servicio
   */
  static async healthCheck(): Promise<{
    ok: boolean;
    model: string;
    error?: string;
  }> {
    try {
      const result = await this.callOpenAI(
        [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "ok"' },
        ],
        {
          model: this.DEFAULT_MODEL,
          temperature: 0,
          maxTokens: 5,
        }
      );

      return {
        ok: true,
        model: result.model,
      };
    } catch (error: any) {
      return {
        ok: false,
        model: this.DEFAULT_MODEL,
        error: error.message,
      };
    }
  }
}
