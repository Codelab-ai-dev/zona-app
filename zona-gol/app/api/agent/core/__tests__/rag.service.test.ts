// =====================================================
// RAG SERVICE TESTS
// =====================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RAGService } from '../rag.service';

// Mock de Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          contains: vi.fn(() => ({
            data: [],
            error: null,
          })),
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
        count: 'exact',
        head: true,
      })),
    })),
    rpc: vi.fn(() => ({
      data: [],
      error: null,
    })),
  })),
}));

// Mock de fetch para OpenAI API - needs to be properly mocked
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RAGService', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.resetAllMocks();
    // Re-assign mock after reset
    global.fetch = mockFetch;
    // Ensure API key is set for tests that need it
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    // Restore original API key
    if (originalApiKey) {
      process.env.OPENAI_API_KEY = originalApiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  describe('generateEmbedding', () => {
    it('should generate embedding from OpenAI', async () => {
      // Mock successful OpenAI response
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      // Access private method via type assertion
      const embedding = await (RAGService as any).generateEmbedding('test query');

      expect(embedding).toHaveLength(1536);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should throw error if OPENAI_API_KEY not configured', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      await expect(
        (RAGService as any).generateEmbedding('test')
      ).rejects.toThrow('OPENAI_API_KEY not configured');

      process.env.OPENAI_API_KEY = originalKey;
    });

    it('should throw error on invalid embedding dimensions', async () => {
      // Mock con dimensiones incorrectas
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: [1, 2, 3] }], // Solo 3 dimensiones
        }),
      });

      await expect(
        (RAGService as any).generateEmbedding('test')
      ).rejects.toThrow('Expected 1536 dimensions');
    });

    it('should handle OpenAI API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        json: async () => ({
          error: { message: 'Invalid API key' },
        }),
      });

      await expect(
        (RAGService as any).generateEmbedding('test')
      ).rejects.toThrow('OpenAI API error');
    });
  });

  describe('searchKnowledge', () => {
    it('should require leagueId for multi-tenant security', async () => {
      await expect(
        RAGService.searchKnowledge('test query', '')
      ).rejects.toThrow('leagueId is required');
    });

    it('should use default options', async () => {
      // Mock embedding generation
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      const result = await RAGService.searchKnowledge(
        'test query',
        'league-123'
      );

      expect(result).toHaveProperty('chunks');
      expect(result).toHaveProperty('totalChunks');
      expect(result).toHaveProperty('avgSimilarity');
      expect(result).toHaveProperty('searchTime');
    });

    it('should apply topK limit', async () => {
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      await RAGService.searchKnowledge('test query', 'league-123', {
        topK: 3,
      });

      // Verificar que se llamó con match_count: 3
      // (en un test real verificaríamos el mock de supabase.rpc)
    });

    it('should calculate average similarity correctly', async () => {
      // Mock embedding y resultados
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      const result = await RAGService.searchKnowledge(
        'test query',
        'league-123'
      );

      // Con chunks vacíos, avgSimilarity debe ser 0
      expect(result.avgSimilarity).toBe(0);
    });

    it('should return empty result if no chunks found', async () => {
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      const result = await RAGService.searchKnowledge(
        'test query',
        'league-123'
      );

      expect(result.chunks).toEqual([]);
      expect(result.totalChunks).toBe(0);
    });
  });

  describe('searchByContentType', () => {
    it('should filter by specific content type', async () => {
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      await RAGService.searchByContentType(
        'calendario jornada 5',
        'league-123',
        'jornada_calendario'
      );

      // En un test real verificaríamos que se pasó contentTypes: ['jornada_calendario']
    });
  });

  describe('formatChunksForLLM', () => {
    it('should format empty chunks correctly', () => {
      const formatted = RAGService.formatChunksForLLM([]);

      expect(formatted).toContain('No se encontró información');
    });

    it('should format chunks with similarity scores', () => {
      const chunks = [
        {
          id: '1',
          contentText: 'Partido: Tigres vs América, 3-2',
          metadata: { jornada: 5, teams: ['Tigres', 'América'] },
          contentType: 'resultado_partido',
          similarity: 0.95,
          leagueId: 'league-123',
        },
        {
          id: '2',
          contentText: 'Jornada 5 se juega el sábado 20 de enero',
          metadata: { jornada: 5, date: '2025-01-20' },
          contentType: 'jornada_calendario',
          similarity: 0.87,
          leagueId: 'league-123',
        },
      ];

      const formatted = RAGService.formatChunksForLLM(chunks);

      expect(formatted).toContain('Fuente 1');
      expect(formatted).toContain('Fuente 2');
      expect(formatted).toContain('similitud: 0.95');
      expect(formatted).toContain('similitud: 0.87');
      expect(formatted).toContain('Jornada: 5');
      expect(formatted).toContain('Equipos: Tigres,América');
      expect(formatted).toContain('Fecha: 2025-01-20');
    });

    it('should handle chunks without metadata', () => {
      const chunks = [
        {
          id: '1',
          contentText: 'Información general de la liga',
          metadata: {},
          contentType: 'informacion_general',
          similarity: 0.75,
          leagueId: 'league-123',
        },
      ];

      const formatted = RAGService.formatChunksForLLM(chunks);

      expect(formatted).toContain('Información general de la liga');
      expect(formatted).not.toContain('Jornada:');
      expect(formatted).not.toContain('Equipos:');
    });
  });

  describe('healthCheck', () => {
    it('should pass when all systems operational', async () => {
      // Mock successful embedding
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      const health = await RAGService.healthCheck();

      expect(health.ok).toBe(true);
      expect(health.embedding).toBe(true);
      expect(health.vectorDB).toBe(true);
    });

    it('should fail when OpenAI not available', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const health = await RAGService.healthCheck();

      expect(health.ok).toBe(false);
      expect(health.embedding).toBe(false);
    });
  });
});

describe('RAGService Integration Tests', () => {
  // Estos tests requieren una base de datos de prueba con pgvector
  // Se pueden ejecutar con `npm run test:integration`

  it.skip('should search knowledge base with real embeddings', async () => {
    // Test de integración real con Supabase + OpenAI
    const result = await RAGService.searchKnowledge(
      '¿Cuándo juega mi equipo?',
      'real-league-id',
      { topK: 5 }
    );

    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it.skip('should retrieve match info correctly', async () => {
    // Test de integración real
    const result = await RAGService.searchMatchInfo(
      'real-match-id',
      'real-league-id'
    );

    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it.skip('should get knowledge base stats', async () => {
    const stats = await RAGService.getKnowledgeBaseStats('real-league-id');

    expect(stats.totalChunks).toBeGreaterThan(0);
    expect(Object.keys(stats.byContentType).length).toBeGreaterThan(0);
  });

  it.skip('should search jornada info', async () => {
    const result = await RAGService.searchJornadaInfo(
      5,
      'real-league-id',
      'real-tournament-id'
    );

    expect(result.chunks.length).toBeGreaterThan(0);
  });
});

describe('RAGService Real-World Scenarios', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = mockFetch;
    process.env.OPENAI_API_KEY = 'test-api-key';

    const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: mockEmbedding }],
      }),
    });
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.OPENAI_API_KEY = originalApiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it('should handle match result queries', async () => {
    const query = '¿Cómo quedó el partido de ayer?';
    const result = await RAGService.searchKnowledge(query, 'league-123', {
      contentTypes: ['resultado_partido'],
    });

    expect(result).toBeDefined();
  });

  it('should handle calendar queries', async () => {
    const query = '¿Qué partidos hay esta semana?';
    const result = await RAGService.searchByContentType(
      query,
      'league-123',
      'jornada_calendario'
    );

    expect(result).toBeDefined();
  });

  it('should handle standings queries', async () => {
    const query = 'Muéstrame la tabla de posiciones';
    const result = await RAGService.searchByContentType(
      query,
      'league-123',
      'tabla_posiciones'
    );

    expect(result).toBeDefined();
  });

  it('should apply similarity threshold correctly', async () => {
    const result = await RAGService.searchKnowledge(
      'test query',
      'league-123',
      {
        similarityThreshold: 0.9, // Solo chunks muy similares
      }
    );

    // En un test real, verificaríamos que solo se retornan chunks > 0.9
    expect(result).toBeDefined();
  });

  it('should handle tournament-specific searches', async () => {
    const result = await RAGService.searchKnowledge(
      'partidos del torneo',
      'league-123',
      {
        tournamentId: 'tournament-456',
      }
    );

    expect(result).toBeDefined();
  });
});
