// =====================================================
// LLM SERVICE TESTS
// =====================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMService } from '../llm.service';
import { UserIdentity } from '@/lib/types/agent.types';

// Mock de fetch global
global.fetch = vi.fn();

describe('LLMService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  describe('generateResponse', () => {
    it('should generate response with context', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: 'Los partidos de la jornada 5 son...',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 50,
          total_tokens: 200,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIResponse,
      });

      const identity: UserIdentity = {
        userIdentifier: 'user1',
        channel: 'whatsapp',
        userId: 'user1',
        role: 'team_owner',
        leagueId: 'league1',
        displayName: 'Juan Pérez',
        isLinked: true,
      };

      const result = await LLMService.generateResponse({
        identity,
        userMessage: '¿Qué partidos hay en la jornada 5?',
        intent: 'calendario',
        sqlContext: 'Jornada 5: Tigres vs América - 2025-01-20',
      });

      expect(result.text).toBe('Los partidos de la jornada 5 son...');
      expect(result.tokensUsed).toBe(200);
      expect(result.costUsd).toBeGreaterThan(0);
      expect(result.finishReason).toBe('stop');
    });

    it('should include conversation history', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: { content: 'Respuesta contextual' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 30,
          total_tokens: 230,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIResponse,
      });

      const identity: UserIdentity = {
        userIdentifier: 'user1',
        channel: 'whatsapp',
        isLinked: true,
      };

      const result = await LLMService.generateResponse({
        identity,
        userMessage: '¿Y mañana?',
        intent: 'calendario',
        conversationHistory: [
          { role: 'user', content: '¿Qué partidos hay hoy?' },
          { role: 'assistant', content: 'Hoy hay 3 partidos...' },
        ],
      });

      expect(result.text).toBeDefined();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should use fallback on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const identity: UserIdentity = {
        userIdentifier: 'user1',
        channel: 'whatsapp',
        isLinked: true,
      };

      const result = await LLMService.generateResponse({
        identity,
        userMessage: 'Test',
        intent: 'calendario',
      });

      expect(result.text).toContain('Lo siento');
      expect(result.finishReason).toBe('error');
      expect(result.costUsd).toBe(0);
    });

    it('should throw error if API key missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const identity: UserIdentity = {
        userIdentifier: 'user1',
        channel: 'whatsapp',
        isLinked: true,
      };

      const result = await LLMService.generateResponse({
        identity,
        userMessage: 'Test',
        intent: 'calendario',
      });

      // Debe usar fallback
      expect(result.finishReason).toBe('error');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should adapt prompt based on role', () => {
      const adminIdentity: UserIdentity = {
        userIdentifier: 'admin1',
        channel: 'web',
        userId: 'admin1',
        role: 'league_admin',
        displayName: 'Admin',
        isLinked: true,
      };

      const prompt = (LLMService as any).buildSystemPrompt(
        adminIdentity,
        'calendario'
      );

      expect(prompt).toContain('Administrador de Liga');
      expect(prompt).toContain('calendario');
    });

    it('should include intent-specific instructions', () => {
      const identity: UserIdentity = {
        userIdentifier: 'user1',
        channel: 'whatsapp',
        isLinked: true,
      };

      const prompt = (LLMService as any).buildSystemPrompt(
        identity,
        'tabla_posiciones'
      );

      expect(prompt).toContain('tabla');
    });

    it('should use casual tone for regular users', () => {
      const identity: UserIdentity = {
        userIdentifier: 'user1',
        channel: 'whatsapp',
        role: 'public',
        isLinked: true,
      };

      const prompt = (LLMService as any).buildSystemPrompt(
        identity,
        'conversacion'
      );

      expect(prompt).toContain('Casual y amigable');
    });
  });

  describe('buildContextMessage', () => {
    it('should combine SQL and RAG context', () => {
      const sqlContext = 'Jornada 5: Tigres vs América';
      const ragContext = 'El partido se juega en el Estadio...';

      const message = (LLMService as any).buildContextMessage(
        ragContext,
        sqlContext
      );

      expect(message).toContain('Datos estructurados');
      expect(message).toContain('Contexto adicional');
      expect(message).toContain(sqlContext);
      expect(message).toContain(ragContext);
    });

    it('should handle only SQL context', () => {
      const sqlContext = 'Tabla: 1. Tigres 23pts';

      const message = (LLMService as any).buildContextMessage(
        undefined,
        sqlContext
      );

      expect(message).toContain(sqlContext);
      expect(message).not.toContain('Contexto adicional');
    });

    it('should handle only RAG context', () => {
      const ragContext = 'Info de la base de conocimiento...';

      const message = (LLMService as any).buildContextMessage(
        ragContext,
        undefined
      );

      expect(message).toContain(ragContext);
      expect(message).not.toContain('Datos estructurados');
    });
  });

  describe('getFallbackResponse', () => {
    it('should return appropriate fallback for each intent', () => {
      const calendarioFallback = (LLMService as any).getFallbackResponse(
        'calendario'
      );
      expect(calendarioFallback).toContain('calendario');

      const unknownFallback = (LLMService as any).getFallbackResponse('unknown');
      expect(unknownFallback).toContain('ayudarte');
    });

    it('should be in Spanish', () => {
      const fallback = (LLMService as any).getFallbackResponse('resultados');
      expect(fallback).toMatch(/[áéíóú]/); // Contains Spanish accents
    });
  });

  describe('validateResponse', () => {
    it('should accept valid responses', () => {
      const validation = LLMService.validateResponse(
        'Los partidos de la jornada 5 son: Tigres vs América el sábado a las 19:00.'
      );

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toBeUndefined();
    });

    it('should reject too short responses', () => {
      const validation = LLMService.validateResponse('Ok');

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Response too short');
    });

    it('should reject too long responses for WhatsApp', () => {
      const longText = 'a'.repeat(2100);
      const validation = LLMService.validateResponse(longText);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain(
        'Response too long for WhatsApp (max 2000 chars)'
      );
    });

    it('should flag responses with URLs', () => {
      const validation = LLMService.validateResponse(
        'Visita https://example.com para más información'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Contains URLs');
    });

    it('should flag AI mentions', () => {
      const validation = LLMService.validateResponse(
        'Como IA, no tengo acceso a esa información'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Mentions being an AI');
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost based on length', () => {
      const shortPrompt = 'Hola';
      const longPrompt = 'a'.repeat(1000);

      const shortCost = LLMService.estimateCost(shortPrompt.length, 100);
      const longCost = LLMService.estimateCost(longPrompt.length, 100);

      expect(longCost).toBeGreaterThan(shortCost);
      expect(shortCost).toBeGreaterThan(0);
    });

    it('should account for max tokens', () => {
      const promptLength = 500;

      const cost100 = LLMService.estimateCost(promptLength, 100);
      const cost500 = LLMService.estimateCost(promptLength, 500);

      expect(cost500).toBeGreaterThan(cost100);
    });

    it('should return reasonable cost estimates', () => {
      // ~1000 chars prompt, 200 tokens response
      const cost = LLMService.estimateCost(1000, 200);

      // Should be less than $0.01 with gpt-4o-mini
      expect(cost).toBeLessThan(0.01);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('summarizeConversation', () => {
    it('should summarize conversation history', () => {
      const messages = [
        { role: 'user' as const, content: '¿Qué partidos hay hoy?' },
        { role: 'assistant' as const, content: 'Hoy hay 3 partidos...' },
        { role: 'user' as const, content: '¿Y mañana?' },
      ];

      const summary = LLMService.summarizeConversation(messages);

      expect(summary).toContain('3 mensajes');
      expect(summary).toContain('¿Y mañana?');
    });

    it('should handle empty conversation', () => {
      const summary = LLMService.summarizeConversation([]);

      expect(summary).toBe('Nueva conversación.');
    });
  });

  describe('healthCheck', () => {
    it('should pass when OpenAI is available', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'ok' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 1,
          total_tokens: 11,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const health = await LLMService.healthCheck();

      expect(health.ok).toBe(true);
      expect(health.model).toBeDefined();
    });

    it('should fail when OpenAI unavailable', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const health = await LLMService.healthCheck();

      expect(health.ok).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  describe('callOpenAI', () => {
    it('should call OpenAI with correct parameters', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Test response' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 20,
          total_tokens: 70,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
      ];

      const result = await (LLMService as any).callOpenAI(messages, {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 100,
      });

      expect(result.text).toBe('Test response');
      expect(result.tokensUsed).toBe(70);
      expect(result.costUsd).toBeGreaterThan(0);

      // Verificar que se llamó con los parámetros correctos
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should handle OpenAI API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Rate limit exceeded' },
        }),
      });

      const messages = [
        { role: 'user' as const, content: 'Test' },
      ];

      await expect(
        (LLMService as any).callOpenAI(messages, {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 100,
        })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle empty response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      });

      const messages = [
        { role: 'user' as const, content: 'Test' },
      ];

      await expect(
        (LLMService as any).callOpenAI(messages, {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 100,
        })
      ).rejects.toThrow('No response from OpenAI');
    });
  });
});

describe('LLMService Integration Tests', () => {
  // Estos tests requieren OPENAI_API_KEY válida
  // Se pueden ejecutar con `npm run test:integration`

  it.skip('should generate real response', async () => {
    const identity: UserIdentity = {
      userIdentifier: 'test-user',
      channel: 'whatsapp',
      displayName: 'Test User',
      isLinked: true,
    };

    const result = await LLMService.generateResponse({
      identity,
      userMessage: '¿Qué partidos hay esta semana?',
      intent: 'calendario',
      sqlContext: 'Jornada 5: Tigres vs América - Sábado 20 enero 19:00',
    });

    expect(result.text.length).toBeGreaterThan(20);
    expect(result.tokensUsed).toBeGreaterThan(0);
    expect(result.costUsd).toBeGreaterThan(0);
  });

  it.skip('should handle conversation context', async () => {
    const identity: UserIdentity = {
      userIdentifier: 'test-user',
      channel: 'whatsapp',
      isLinked: true,
    };

    const result = await LLMService.generateResponse({
      identity,
      userMessage: '¿Y el siguiente partido?',
      intent: 'proximos_partidos',
      conversationHistory: [
        { role: 'user', content: '¿Cuándo juega Tigres?' },
        {
          role: 'assistant',
          content: 'Tigres juega el sábado contra América',
        },
      ],
    });

    expect(result.text).toBeDefined();
  });
});

describe('LLMService Real-World Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('should handle league admin requesting stats', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content:
              'Los goleadores de la liga son: 1. Carlos Gómez (15 goles)...',
          },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const identity: UserIdentity = {
      userIdentifier: 'admin1',
      channel: 'web',
      userId: 'admin1',
      role: 'league_admin',
      displayName: 'Admin',
      isLinked: true,
    };

    const result = await LLMService.generateResponse({
      identity,
      userMessage: '¿Quiénes son los máximos goleadores?',
      intent: 'estadisticas',
      sqlContext: '1. Carlos Gómez - 15 goles\n2. Luis Rodríguez - 12 goles',
    });

    expect(result.text).toContain('goleadores');
  });

  it('should handle team owner asking about their team', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: 'Tu equipo Tigres juega el sábado contra América...',
          },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160 },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const identity: UserIdentity = {
      userIdentifier: 'owner1',
      channel: 'whatsapp',
      role: 'team_owner',
      displayName: 'Juan',
      isLinked: true,
    };

    const result = await LLMService.generateResponse({
      identity,
      userMessage: '¿Cuándo juega mi equipo?',
      intent: 'proximos_partidos',
      sqlContext: 'Tigres vs América - Sábado 20/01 19:00',
    });

    expect(result.text).toBeDefined();
  });
});
