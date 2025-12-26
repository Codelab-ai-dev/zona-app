import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/play/clips - Obtener lista de clips
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    // Parámetros de filtro
    const recordingId = searchParams.get("recording_id");
    const matchId = searchParams.get("match_id");
    const leagueId = searchParams.get("league_id");
    const teamId = searchParams.get("team_id");
    const playerId = searchParams.get("player_id");
    const clipType = searchParams.get("clip_type");
    const featured = searchParams.get("featured");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sort_by") || "created_at";
    const sortOrder = searchParams.get("sort_order") || "desc";

    // Construir query
    let query = supabase
      .from("video_clips")
      .select(`
        *,
        match_recordings (
          id,
          title,
          matches (
            id,
            home_team:teams!matches_home_team_id_fkey (id, name, logo_url),
            away_team:teams!matches_away_team_id_fkey (id, name, logo_url)
          )
        ),
        players (id, name, photo_url),
        teams (id, name, logo_url),
        leagues (id, name, slug)
      `)
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    // Aplicar filtros opcionales
    if (recordingId) {
      query = query.eq("recording_id", recordingId);
    }
    if (matchId) {
      query = query.eq("match_id", matchId);
    }
    if (leagueId) {
      query = query.eq("league_id", leagueId);
    }
    if (teamId) {
      query = query.eq("team_id", teamId);
    }
    if (playerId) {
      query = query.eq("player_id", playerId);
    }
    if (clipType) {
      query = query.eq("clip_type", clipType);
    }
    if (featured === "true") {
      query = query.eq("is_featured", true);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching clips:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      clips: data || [],
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in GET /api/play/clips:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/play/clips - Crear nuevo clip
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
      recording_id,
      match_id,
      league_id,
      clip_type,
      title,
      description,
      start_time_seconds,
      end_time_seconds,
      match_minute,
      player_id,
      team_id,
      ai_generated = false,
      ai_confidence,
      ai_tags,
    } = body;

    // Validar campos requeridos
    if (!title || start_time_seconds === undefined || end_time_seconds === undefined) {
      return NextResponse.json(
        { error: "title, start_time_seconds, and end_time_seconds are required" },
        { status: 400 }
      );
    }

    // Crear clip
    const { data, error } = await supabase
      .from("video_clips")
      .insert({
        recording_id,
        match_id,
        league_id,
        clip_type,
        title,
        description,
        start_time_seconds,
        end_time_seconds,
        match_minute,
        player_id,
        team_id,
        ai_generated,
        ai_confidence,
        ai_tags,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating clip:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clip: data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/play/clips:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
