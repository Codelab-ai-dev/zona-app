import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/agent/debug?phone=+5491123456789
 *
 * Endpoint de diagnóstico para debuggear problemas del agente
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const phone = searchParams.get('phone');

  const supabase = await createServerSupabaseClient();
  const debug: Record<string, any> = {};

  try {
    // 1. Verificar whatsapp_user_links
    if (phone) {
      const { data: link, error: linkError } = await supabase
        .from('whatsapp_user_links')
        .select('*')
        .eq('phone_number', phone)
        .eq('is_active', true)
        .single();

      debug.whatsapp_link = {
        found: !!link,
        data: link,
        error: linkError?.message,
      };

      // Si encontramos el link, buscar info de liga y torneo
      if (link) {
        const linkData = link as any;

        // Info de liga
        if (linkData.league_id) {
          const { data: league } = await supabase
            .from('leagues')
            .select('id, name, slug')
            .eq('id', linkData.league_id)
            .single();
          debug.league = league;
        }

        // Info de torneo
        if (linkData.tournament_id) {
          const { data: tournament } = await supabase
            .from('tournaments')
            .select('id, name, status')
            .eq('id', linkData.tournament_id)
            .single();
          debug.tournament = tournament;
        }

        // Contar embeddings para esta liga
        if (linkData.league_id) {
          const { count: embeddingsCount } = await supabase
            .from('league_knowledge_base')
            .select('*', { count: 'exact', head: true })
            .eq('league_id', linkData.league_id);

          debug.embeddings_count_for_league = embeddingsCount;

          // Muestra de embeddings (primeros 5)
          const { data: sampleEmbeddings } = await supabase
            .from('league_knowledge_base')
            .select('id, content_type, content, metadata, tournament_id')
            .eq('league_id', linkData.league_id)
            .limit(5);

          debug.sample_embeddings = sampleEmbeddings?.map((e: any) => ({
            id: e.id,
            content_type: e.content_type,
            content_preview: e.content?.substring(0, 100) + '...',
            metadata: e.metadata,
            tournament_id: e.tournament_id,
          }));

          // Buscar específicamente jornada 2
          const { data: jornada2, count: jornada2Count } = await supabase
            .from('league_knowledge_base')
            .select('*', { count: 'exact' })
            .eq('league_id', linkData.league_id)
            .contains('metadata', { jornada: 2 });

          debug.jornada_2_by_metadata = {
            count: jornada2Count,
            data: jornada2?.map((e: any) => ({
              id: e.id,
              content_preview: e.content?.substring(0, 200),
              metadata: e.metadata,
            })),
          };

          // Buscar por texto
          const { data: jornada2Text, count: jornada2TextCount } = await supabase
            .from('league_knowledge_base')
            .select('*', { count: 'exact' })
            .eq('league_id', linkData.league_id)
            .ilike('content', '%jornada 2%');

          debug.jornada_2_by_text = {
            count: jornada2TextCount,
            data: jornada2Text?.map((e: any) => ({
              id: e.id,
              content_preview: e.content?.substring(0, 200),
              metadata: e.metadata,
            })),
          };
        }
      }
    }

    // 2. Listar todas las ligas con embeddings
    const { data: allLeagues } = await supabase
      .from('leagues')
      .select('id, name, slug');

    const leaguesWithEmbeddings = [];
    for (const league of (allLeagues || [])) {
      const leagueData = league as any;
      const { count } = await supabase
        .from('league_knowledge_base')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueData.id);

      if (count && count > 0) {
        leaguesWithEmbeddings.push({
          id: leagueData.id,
          name: leagueData.name,
          embeddings_count: count,
        });
      }
    }

    debug.leagues_with_embeddings = leaguesWithEmbeddings;

    // 3. Verificar estructura de metadata de embeddings
    const { data: metadataSample } = await supabase
      .from('league_knowledge_base')
      .select('metadata')
      .limit(10);

    debug.metadata_structure_samples = metadataSample?.map((m: any) => m.metadata);

    return NextResponse.json({
      status: 'debug',
      timestamp: new Date().toISOString(),
      debug,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
}
