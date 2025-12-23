import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/play/videos - Obtener lista de videos
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    // Parámetros de filtro
    const leagueId = searchParams.get("league_id");
    const teamId = searchParams.get("team_id");
    const status = searchParams.get("status") || "ready";
    const visibility = searchParams.get("visibility") || "public";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Construir query
    let query = supabase
      .from("match_recordings")
      .select(`
        *,
        matches (
          id,
          home_team:teams!matches_home_team_id_fkey (id, name, logo_url),
          away_team:teams!matches_away_team_id_fkey (id, name, logo_url),
          home_score,
          away_score,
          match_date
        ),
        leagues (id, name, slug)
      `)
      .eq("status", status)
      .eq("visibility", visibility)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtros opcionales
    if (leagueId) {
      query = query.eq("league_id", leagueId);
    }
    if (teamId) {
      // Filtrar por equipo (home o away)
      query = query.or(`matches.home_team_id.eq.${teamId},matches.away_team_id.eq.${teamId}`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching videos:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      videos: data || [],
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in GET /api/play/videos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/play/videos - Crear nuevo video (requiere auth)
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
      tournament_id,
      title,
      description,
      source_type = "manual",
      source_device_id,
    } = body;

    // Validar campos requeridos
    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Crear registro de video
    const { data, error } = await supabase
      .from("match_recordings")
      .insert({
        match_id,
        league_id,
        tournament_id,
        title,
        description,
        source_type,
        source_device_id,
        status: "pending",
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating video:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ video: data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/play/videos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
