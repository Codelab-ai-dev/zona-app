// =====================================================
// ROUTER SERVICE TESTS
// =====================================================

import { describe, it, expect } from 'vitest';
import { RouterService } from '../router.service';

describe('RouterService', () => {
  describe('classifyIntent', () => {
    it('should classify "calendario" intent', async () => {
      const result = await RouterService.classifyIntent(
        '¿Qué partidos hay esta semana?',
        { userIdentifier: 'test', channel: 'whatsapp', isLinked: true }
      );

      expect(result.intent).toBe('calendario');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.suggestedApproach).toBe('sql');
    });

    it('should classify "resultados" intent', async () => {
      const result = await RouterService.classifyIntent(
        '¿Cómo quedó el partido de ayer?',
        { userIdentifier: 'test', channel: 'whatsapp', isLinked: true }
      );

      expect(result.intent).toBe('resultados');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.suggestedApproach).toBe('both');
    });

    it('should classify "tabla_posiciones" intent', async () => {
      const result = await RouterService.classifyIntent(
        'Muéstrame la tabla de posiciones',
        { userIdentifier: 'test', channel: 'whatsapp', isLinked: true }
      );

      expect(result.intent).toBe('tabla_posiciones');
      expect(result.suggestedApproach).toBe('sql');
    });

    it('should classify "suspensiones" intent', async () => {
      const result = await RouterService.classifyIntent(
        '¿Quiénes están suspendidos?',
        { userIdentifier: 'test', channel: 'whatsapp', isLinked: true }
      );

      expect(result.intent).toBe('suspensiones');
      expect(result.suggestedApproach).toBe('sql');
    });

    it('should classify "proximos_partidos" intent', async () => {
      const result = await RouterService.classifyIntent(
        '¿Cuándo juega mi equipo?',
        { userIdentifier: 'test', channel: 'whatsapp', isLinked: true }
      );

      expect(result.intent).toBe('proximos_partidos');
      expect(result.suggestedApproach).toBe('sql');
    });

    it('should classify "conversacion" intent for greetings', async () => {
      const result = await RouterService.classifyIntent(
        'Hola, buenos días',
        { userIdentifier: 'test', channel: 'whatsapp', isLinked: true }
      );

      expect(result.intent).toBe('conversacion');
      expect(result.suggestedApproach).toBe('rag');
    });

    it('should return "unknown" for unclear messages', async () => {
      const result = await RouterService.classifyIntent(
        'asdf qwerty 123',
        { userIdentifier: 'test', channel: 'whatsapp', isLinked: true }
      );

      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('extractEntities', () => {
    it('should extract jornada number', () => {
      const entities = RouterService.extractEntities(
        'Muéstrame los partidos de la jornada 5',
        'calendario'
      );

      expect(entities.jornada).toBe(5);
    });

    it('should extract temporal references', () => {
      const today = RouterService.extractEntities(
        'Qué partidos hay hoy',
        'calendario'
      );
      expect(today.date).toBe('today');

      const tomorrow = RouterService.extractEntities(
        'Qué juegos hay mañana',
        'calendario'
      );
      expect(tomorrow.date).toBe('tomorrow');

      const thisWeek = RouterService.extractEntities(
        'Partidos de esta semana',
        'calendario'
      );
      expect(thisWeek.date).toBe('this_week');
    });

    it('should extract team name from "contra"', () => {
      const entities = RouterService.extractEntities(
        'Cuándo juega mi equipo contra Tigres',
        'proximos_partidos'
      );

      expect(entities.team_name).toBe('tigres');
    });

    it('should handle accents in extraction', () => {
      const entities = RouterService.extractEntities(
        'Muéstrame la jornada 3',
        'calendario'
      );

      expect(entities.jornada).toBe(3);
    });
  });

  describe('normalizeText', () => {
    it('should convert to lowercase', () => {
      const result = (RouterService as any).normalizeText('HOLA MUNDO');
      expect(result).toBe('hola mundo');
    });

    it('should remove accents', () => {
      const result = (RouterService as any).normalizeText('áéíóú ñ');
      expect(result).toBe('aeiou n');
    });

    it('should remove question/exclamation marks', () => {
      const result = (RouterService as any).normalizeText('¿Hola? ¡Mundo!');
      expect(result).toBe('hola mundo');
    });
  });

  describe('enhanceMessage', () => {
    it('should expand abbreviations', () => {
      const result = RouterService.enhanceMessage('q partidos hay tmb');
      expect(result).toContain('que');
      expect(result).toContain('también');
    });

    it('should correct common errors', () => {
      const result = RouterService.enhanceMessage('cuando juega mi equipo');
      expect(result).toContain('cuándo');
    });
  });

  describe('requiresLeagueContext', () => {
    it('should require context for data-related intents', () => {
      expect(RouterService.requiresLeagueContext('calendario')).toBe(true);
      expect(RouterService.requiresLeagueContext('resultados')).toBe(true);
      expect(RouterService.requiresLeagueContext('tabla_posiciones')).toBe(true);
    });

    it('should not require context for general intents', () => {
      expect(RouterService.requiresLeagueContext('conversacion')).toBe(false);
      expect(RouterService.requiresLeagueContext('informacion_general')).toBe(false);
    });
  });

  describe('suggestFollowUpQuestions', () => {
    it('should suggest relevant follow-up questions', () => {
      const suggestions = RouterService.suggestFollowUpQuestions('calendario');

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('jornada'))).toBe(true);
    });
  });
});

describe('RouterService Integration Tests', () => {
  it('should handle complex real-world messages', async () => {
    const messages = [
      {
        text: 'Oye, ¿cuándo juega el equipo contra las Águilas?',
        expectedIntent: 'proximos_partidos',
      },
      {
        text: 'Qué tal! Quiero ver los resultados de ayer',
        expectedIntent: 'resultados',
      },
      {
        text: 'Muéstrame quién va primero en la tabla',
        expectedIntent: 'tabla_posiciones',
      },
      {
        text: 'Hay jugadores suspendidos para el próximo partido?',
        expectedIntent: 'suspensiones',
      },
      {
        text: 'Hola buen día, necesito ayuda',
        expectedIntent: 'conversacion',
      },
    ];

    for (const { text, expectedIntent } of messages) {
      const result = await RouterService.classifyIntent(
        text,
        { userIdentifier: 'test', channel: 'whatsapp', isLinked: true }
      );

      expect(result.intent).toBe(expectedIntent);
    }
  });

  it('should handle messages with typos and informal language', async () => {
    const result = await RouterService.classifyIntent(
      'q partidos ai esta smana?', // Con typos
      { userIdentifier: 'test', channel: 'whatsapp', isLinked: true }
    );

    // Debería aún detectar calendario
    expect(result.intent).toBe('calendario');
  });

  it('should handle mixed intents and choose primary', async () => {
    const result = await RouterService.classifyIntent(
      '¿Qué partidos hay hoy y quién va ganando la tabla?',
      { userIdentifier: 'test', channel: 'whatsapp', isLinked: true }
    );

    // Debería elegir uno de los dos (calendario o tabla_posiciones)
    expect(['calendario', 'tabla_posiciones']).toContain(result.intent);
  });
});
