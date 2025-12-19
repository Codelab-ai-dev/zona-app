// =====================================================
// RAG SERVICE
// =====================================================
// Maneja búsqueda vectorial en league_knowledge_base
// Genera embeddings y busca chunks relevantes con pgvector
// =====================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { RAGChunk } from '@/lib/types/agent.types';

/**
 * Opciones para búsqueda RAG
 */
interface RAGSearchOptions {
  topK?: number;                  // Número máximo de chunks (default: 5)
  similarityThreshold?: number;   // Threshold de similitud 0-1 (default: 0.7)
  contentTypes?: string[];        // Filtrar por tipos de contenido
  tournamentId?: string;          // Filtrar por torneo específico
}

/**
 * Resultado de búsqueda RAG con metadata
 */
interface RAGSearchResult {
  chunks: RAGChunk[];
  totalChunks: number;
  avgSimilarity: number;
  searchTime: number;
}

export class RAGService {
  // Modelo de embeddings (mismo que en generate_embeddings.ts)
  private static readonly EMBEDDING_MODEL = 'text-embedding-3-small';
  private static readonly EMBEDDING_DIMENSIONS = 1536;

  // Defaults
  private static readonly DEFAULT_TOP_K = 5;
  private static readonly DEFAULT_SIMILARITY_THRESHOLD = 0.7;

  /**
   * Busca conocimiento relevante en la base vectorial
   *
   * Flujo:
   * 1. Genera embedding de la query del usuario
   * 2. Busca en league_knowledge_base usando pgvector (cosine distance)
   * 3. Aplica filtros multi-tenant (league_id obligatorio)
   * 4. Retorna top-k chunks con mayor similitud
   *
   * @param query - Pregunta o consulta del usuario
   * @param leagueId - ID de la liga (multi-tenant obligatorio)
   * @param options - Opciones de búsqueda
   * @returns Chunks relevantes ordenados por similitud
   */
  static async searchKnowledge(
    query: string,
    leagueId: string,
    options: RAGSearchOptions = {}
  ): Promise<RAGSearchResult> {
    const startTime = Date.now();

    // Validar league_id
    if (!leagueId) {
      throw new Error('leagueId is required for RAG search (multi-tenant)');
    }

    // Defaults
    const {
      topK = this.DEFAULT_TOP_K,
      similarityThreshold = this.DEFAULT_SIMILARITY_THRESHOLD,
      contentTypes,
      tournamentId,
    } = options;

    console.log(`🔍 RAG Search: "${query.substring(0, 50)}..." in league ${leagueId}`);

    try {
      // Paso 1: Generar embedding de la query
      const queryEmbedding = await this.generateEmbedding(query);

      // Paso 2: Buscar en league_knowledge_base usando pgvector
      const chunks = await this.searchVectorDatabase(
        queryEmbedding,
        leagueId,
        topK,
        similarityThreshold,
        contentTypes,
        tournamentId
      );

      // Calcular estadísticas
      const avgSimilarity = chunks.length > 0
        ? chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length
        : 0;

      const searchTime = Date.now() - startTime;

      console.log(`✅ RAG Search: Found ${chunks.length} chunks (avg similarity: ${avgSimilarity.toFixed(3)}, ${searchTime}ms)`);

      return {
        chunks,
        totalChunks: chunks.length,
        avgSimilarity,
        searchTime,
      };
    } catch (error) {
      console.error('❌ RAG Search failed:', error);
      throw error;
    }
  }

  /**
   * Busca en la base de datos vectorial usando pgvector
   *
   * @param embedding - Vector de la query
   * @param leagueId - ID de la liga (filtro obligatorio)
   * @param limit - Número máximo de resultados
   * @param threshold - Threshold de similitud
   * @param contentTypes - Tipos de contenido a filtrar
   * @param tournamentId - ID del torneo (opcional)
   * @returns Lista de chunks relevantes
   */
  private static async searchVectorDatabase(
    embedding: number[],
    leagueId: string,
    limit: number,
    threshold: number,
    contentTypes?: string[],
    tournamentId?: string
  ): Promise<RAGChunk[]> {
    const supabase = await createServerSupabaseClient();

    // Construir query con match_league_knowledge
    // Esta función RPC está definida en la migración de vector DB
    // @ts-expect-error - Supabase type inference issue without generated types
    let query = supabase.rpc('match_league_knowledge', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
      filter_league_id: leagueId,
      filter_tournament_id: tournamentId || null,
    });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Vector search error:', error);
      throw new Error(`Vector search failed: ${error.message}`);
    }

    // Type assertion for Supabase result
    const rawData = data as any;

    if (!rawData || rawData.length === 0) {
      console.log(`⚠️ No chunks found for league ${leagueId}`);
      return [];
    }

    // Filtrar por content_type si se especificó
    let filteredData = rawData;
    if (contentTypes && contentTypes.length > 0) {
      filteredData = rawData.filter((chunk: any) =>
        contentTypes.includes(chunk.content_type)
      );
    }

    // Mapear a RAGChunk
    const chunks: RAGChunk[] = filteredData.map((row: any) => ({
      id: row.id,
      contentText: row.content_text || row.content, // DB column is content_text
      metadata: row.metadata || {},
      contentType: row.content_type,
      similarity: 1 - row.distance, // pgvector retorna distance, convertir a similarity
      leagueId: row.league_id,
      tournamentId: row.tournament_id,
      matchId: row.match_id,
    }));

    return chunks;
  }

  /**
   * Genera embedding usando OpenAI API
   *
   * @param text - Texto a convertir en embedding
   * @returns Vector de embeddings (1536 dimensiones)
   */
  private static async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.EMBEDDING_MODEL,
          input: text,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const result = await response.json();

      if (!result.data || !result.data[0] || !result.data[0].embedding) {
        throw new Error('Invalid embedding response from OpenAI');
      }

      const embedding = result.data[0].embedding;

      // Validar dimensiones
      if (embedding.length !== this.EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Expected ${this.EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`
        );
      }

      return embedding;
    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Busca chunks específicos por tipo de contenido
   *
   * Útil para preguntas específicas como:
   * - "¿Cuándo es la jornada 5?" → contentType: 'jornada_calendario'
   * - "¿Quién ganó ayer?" → contentType: 'resultado_partido'
   *
   * @param query - Consulta del usuario
   * @param leagueId - ID de la liga
   * @param contentType - Tipo de contenido específico
   * @param options - Opciones adicionales
   * @returns Chunks del tipo especificado
   */
  static async searchByContentType(
    query: string,
    leagueId: string,
    contentType: string,
    options: Omit<RAGSearchOptions, 'contentTypes'> = {}
  ): Promise<RAGSearchResult> {
    return this.searchKnowledge(query, leagueId, {
      ...options,
      contentTypes: [contentType],
    });
  }

  /**
   * Busca información de un partido específico
   *
   * @param matchId - ID del partido
   * @param leagueId - ID de la liga
   * @returns Chunks relacionados al partido
   */
  static async searchMatchInfo(
    matchId: string,
    leagueId: string
  ): Promise<RAGSearchResult> {
    const supabase = await createServerSupabaseClient();

    // Buscar chunks con match_id en metadata
    const { data, error } = await supabase
      .from('league_knowledge_base')
      .select('*')
      .eq('league_id', leagueId)
      .contains('metadata', { match_id: matchId });

    if (error) {
      throw new Error(`Failed to search match info: ${error.message}`);
    }

    const chunks: RAGChunk[] = (data || []).map((row: any) => ({
      id: row.id,
      contentText: row.content_text || row.content, // DB column is content_text
      metadata: row.metadata || {},
      contentType: row.content_type,
      similarity: 1.0, // Match exacto, no hay distance
      leagueId: row.league_id,
      tournamentId: row.tournament_id,
      matchId: row.match_id,
    }));

    return {
      chunks,
      totalChunks: chunks.length,
      avgSimilarity: 1.0,
      searchTime: 0,
    };
  }

  /**
   * Busca información de una jornada específica
   *
   * @param jornada - Número de jornada (1-20)
   * @param leagueId - ID de la liga
   * @param tournamentId - ID del torneo (opcional)
   * @returns Chunks de la jornada
   */
  static async searchJornadaInfo(
    jornada: number,
    leagueId: string,
    tournamentId?: string
  ): Promise<RAGSearchResult> {
    const supabase = await createServerSupabaseClient();
    const startTime = Date.now();

    console.log(`🔍 RAG: Searching jornada ${jornada} in league ${leagueId}, tournament ${tournamentId || 'any'}`);

    // Try multiple search strategies

    // Strategy 1: Search by metadata.round (how embeddings are stored via generate-embedding API)
    if (tournamentId) {
      const { data: dataByRound, error: errorByRound } = await supabase
        .from('league_knowledge_base')
        .select('*')
        .eq('league_id', leagueId)
        .eq('tournament_id', tournamentId)
        .contains('metadata', { round: jornada });

      if (!errorByRound && dataByRound && dataByRound.length > 0) {
        console.log(`✅ RAG: Found ${dataByRound.length} chunks by metadata.round with tournament`);
        return this.mapToRAGResult(dataByRound, startTime);
      }
    }

    // Strategy 2: Search by metadata.round without tournament filter
    const { data: dataByRoundNoTournament } = await supabase
      .from('league_knowledge_base')
      .select('*')
      .eq('league_id', leagueId)
      .contains('metadata', { round: jornada });

    if (dataByRoundNoTournament && dataByRoundNoTournament.length > 0) {
      console.log(`✅ RAG: Found ${dataByRoundNoTournament.length} chunks by metadata.round`);
      return this.mapToRAGResult(dataByRoundNoTournament, startTime);
    }

    // Strategy 3: Search by metadata.jornada (alternative format)
    const { data: dataByJornada } = await supabase
      .from('league_knowledge_base')
      .select('*')
      .eq('league_id', leagueId)
      .contains('metadata', { jornada });

    if (dataByJornada && dataByJornada.length > 0) {
      console.log(`✅ RAG: Found ${dataByJornada.length} chunks by metadata.jornada`);
      return this.mapToRAGResult(dataByJornada, startTime);
    }

    // Strategy 4: Text search in content_text
    console.log(`⚠️ RAG: No metadata match, trying text search for jornada ${jornada}`);
    const { data: textData, error: textError } = await supabase
      .from('league_knowledge_base')
      .select('*')
      .eq('league_id', leagueId)
      .or(`content_text.ilike.%jornada ${jornada}%,content_text.ilike.%jornada%${jornada}%`);

    if (!textError && textData && textData.length > 0) {
      console.log(`✅ RAG: Found ${textData.length} chunks via text search`);
      return this.mapToRAGResult(textData, startTime);
    }

    // Strategy 5: Get ALL content for this league (fallback)
    console.log(`⚠️ RAG: No specific match, getting all knowledge for league`);
    const { data: allData } = await supabase
      .from('league_knowledge_base')
      .select('*')
      .eq('league_id', leagueId)
      .limit(10);

    if (allData && allData.length > 0) {
      console.log(`✅ RAG: Found ${allData.length} general chunks for league`);
      return this.mapToRAGResult(allData, startTime);
    }

    console.log(`❌ RAG: No knowledge found for league ${leagueId}`);
    return this.mapToRAGResult([], startTime);
  }

  /**
   * Mapea datos de Supabase a resultado RAG
   */
  private static mapToRAGResult(data: any[], startTime: number): RAGSearchResult {
    const chunks: RAGChunk[] = (data || []).map((row: any) => {
      const contentText = row.content_text || row.content;

      // Debug: log what we're getting from the database
      console.log(`📄 RAG Chunk: id=${row.id}, content_type=${row.content_type}`);
      console.log(`📄 RAG Chunk columns:`, Object.keys(row));
      console.log(`📄 RAG Chunk content_text length:`, contentText?.length || 0);
      console.log(`📄 RAG Chunk content preview:`, contentText?.substring(0, 200) || 'EMPTY');

      return {
        id: row.id,
        contentText: contentText,
        metadata: row.metadata || {},
        contentType: row.content_type,
        similarity: 1.0,
        leagueId: row.league_id,
        tournamentId: row.tournament_id,
        matchId: row.match_id,
      };
    });

    return {
      chunks,
      totalChunks: chunks.length,
      avgSimilarity: 1.0,
      searchTime: Date.now() - startTime,
    };
  }

  /**
   * Obtiene estadísticas de la base de conocimiento
   *
   * @param leagueId - ID de la liga
   * @returns Estadísticas de contenido
   */
  static async getKnowledgeBaseStats(leagueId: string): Promise<{
    totalChunks: number;
    byContentType: Record<string, number>;
    lastUpdated?: Date;
  }> {
    const supabase = await createServerSupabaseClient();

    // Total de chunks
    const { count: totalChunks, error: countError } = await supabase
      .from('league_knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    if (countError) {
      throw new Error(`Failed to get knowledge base stats: ${countError.message}`);
    }

    // Chunks por tipo
    const { data: chunks, error: chunksError } = await supabase
      .from('league_knowledge_base')
      .select('content_type')
      .eq('league_id', leagueId);

    if (chunksError) {
      throw new Error(`Failed to get chunks by type: ${chunksError.message}`);
    }

    const byContentType: Record<string, number> = {};
    (chunks || []).forEach((chunk: any) => {
      const type = chunk.content_type || 'unknown';
      byContentType[type] = (byContentType[type] || 0) + 1;
    });

    // Última actualización
    const { data: lastChunk } = await supabase
      .from('league_knowledge_base')
      .select('created_at')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastChunkData = lastChunk as any;

    return {
      totalChunks: totalChunks || 0,
      byContentType,
      lastUpdated: lastChunkData ? new Date(lastChunkData.created_at) : undefined,
    };
  }

  /**
   * Valida que la base de conocimiento esté configurada correctamente
   *
   * @returns true si todo está OK
   */
  static async healthCheck(): Promise<{
    ok: boolean;
    embedding: boolean;
    vectorDB: boolean;
    error?: string;
  }> {
    try {
      // Test 1: Verificar que OpenAI API funciona
      const testEmbedding = await this.generateEmbedding('test');
      const embeddingOk = testEmbedding.length === this.EMBEDDING_DIMENSIONS;

      // Test 2: Verificar que pgvector funciona
      const supabase = await createServerSupabaseClient();
      // @ts-expect-error - Supabase type inference issue without generated types
      const { error: vectorError } = await supabase.rpc('match_league_knowledge', {
        query_embedding: testEmbedding,
        match_threshold: 0.5,
        match_count: 1,
        filter_league_id: '00000000-0000-0000-0000-000000000000', // UUID dummy
        filter_tournament_id: null,
      });

      const vectorDbOk = !vectorError;

      return {
        ok: embeddingOk && vectorDbOk,
        embedding: embeddingOk,
        vectorDB: vectorDbOk,
        error: vectorError?.message,
      };
    } catch (error: any) {
      return {
        ok: false,
        embedding: false,
        vectorDB: false,
        error: error.message,
      };
    }
  }

  /**
   * Formatea chunks para usar en prompt de LLM
   *
   * @param chunks - Lista de chunks
   * @returns String formateado para contexto de LLM
   */
  static formatChunksForLLM(chunks: RAGChunk[]): string {
    if (chunks.length === 0) {
      return 'No se encontró información relevante en la base de conocimiento.';
    }

    let formatted = 'Información relevante encontrada:\n\n';

    chunks.forEach((chunk, index) => {
      formatted += `--- Fuente ${index + 1} (similitud: ${chunk.similarity.toFixed(2)}) ---\n`;

      // Debug: check if contentText is actually set
      if (!chunk.contentText) {
        console.log(`⚠️ Chunk ${index + 1} has NO contentText!`);
        formatted += '[CONTENIDO NO DISPONIBLE]\n';
      } else {
        console.log(`✅ Chunk ${index + 1} contentText length: ${chunk.contentText.length}`);
        formatted += `${chunk.contentText}\n`;
      }

      // Agregar metadata relevante
      if (chunk.metadata.jornada) {
        formatted += `Jornada: ${chunk.metadata.jornada}\n`;
      }
      if (chunk.metadata.round) {
        formatted += `Jornada: ${chunk.metadata.round}\n`;
      }
      if (chunk.metadata.teams) {
        formatted += `Equipos: ${chunk.metadata.teams}\n`;
      }
      if (chunk.metadata.date) {
        formatted += `Fecha: ${chunk.metadata.date}\n`;
      }

      formatted += '\n';
    });

    return formatted;
  }
}
