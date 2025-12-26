import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/play/streams - Obtener lista de streams (activos y programados)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    // Parámetros de filtro
    const leagueId = searchParams.get("league_id");
    const status = searchParams.get("status"); // idle, connecting, live, ended
    const upcoming = searchParams.get("upcoming"); // true para streams programados
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Construir query
    let query = supabase
      .from("live_streams")
      .select(`
        *,
        matches (
          id,
          home_team:teams!matches_home_team_id_fkey (id, name, logo_url),
          away_team:teams!matches_away_team_id_fkey (id, name, logo_url),
          home_score,
          away_score,
          match_date,
          match_time
        ),
        leagues (id, name, slug)
      `)
      .order("scheduled_start", { ascending: true })
      .range(offset, offset + limit - 1);

    // Aplicar filtros
    if (leagueId) {
      query = query.eq("league_id", leagueId);
    }

    if (status) {
      query = query.eq("status", status);
    } else if (upcoming === "true") {
      // Streams programados para el futuro
      query = query
        .in("status", ["idle", "connecting"])
        .gte("scheduled_start", new Date().toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching streams:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      streams: data || [],
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in GET /api/play/streams:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/play/streams - Crear nuevo stream
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      match_id,
      league_id,
      title,
      description,
      scheduled_start,
      source_type = "xbotgo",
      is_pay_per_view = false,
      price_cents,
    } = body;

    // Validar campos requeridos
    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // TODO: Crear stream en Mux Live API
    // const muxStream = await createMuxLiveStream();

    // Crear registro de stream
    const { data, error } = await supabase
      .from("live_streams")
      .insert({
        match_id,
        league_id,
        title,
        description,
        scheduled_start,
        source_type,
        is_pay_per_view,
        price_cents,
        status: "idle",
        broadcaster_id: user.id,
        // mux_live_stream_id: muxStream.id,
        // mux_stream_key: muxStream.stream_key,
        // mux_playback_id: muxStream.playback_ids[0].id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating stream:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stream: data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/play/streams:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
