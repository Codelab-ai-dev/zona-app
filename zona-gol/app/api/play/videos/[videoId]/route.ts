import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ videoId: string }>;
}

// GET /api/play/videos/[videoId] - Obtener video específico
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { videoId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("match_recordings")
      .select(`
        *,
        matches (
          id,
          home_team:teams!matches_home_team_id_fkey (id, name, logo_url),
          away_team:teams!matches_away_team_id_fkey (id, name, logo_url),
          home_score,
          away_score,
          match_date,
          match_time,
          status
        ),
        leagues (id, name, slug),
        video_clips (
          id,
          title,
          clip_type,
          start_time_seconds,
          end_time_seconds,
          thumbnail_url,
          views_count
        )
      `)
      .eq("id", videoId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }
      console.error("Error fetching video:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Incrementar contador de vistas (fire-and-forget)
    supabase
      .from("match_recordings")
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq("id", videoId)
      .then(() => {});

    return NextResponse.json({ video: data });
  } catch (error) {
    console.error("Error in GET /api/play/videos/[videoId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/play/videos/[videoId] - Actualizar video
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { videoId } = await params;
    const supabase = await createServerSupabaseClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const allowedFields = [
      "title",
      "description",
      "thumbnail_url",
      "visibility",
      "is_premium",
      "price_cents",
      "status",
      "video_url",
      "mux_asset_id",
      "mux_playback_id",
      "duration_seconds",
      "resolution",
      "published_at",
    ];

    // Filtrar solo campos permitidos
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("match_recordings")
      .update(updates)
      .eq("id", videoId)
      .select()
      .single();

    if (error) {
      console.error("Error updating video:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ video: data });
  } catch (error) {
    console.error("Error in PATCH /api/play/videos/[videoId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/play/videos/[videoId] - Eliminar video
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { videoId } = await params;
    const supabase = await createServerSupabaseClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Verificar permisos del usuario para eliminar este video
    // TODO: Eliminar video de Mux si existe

    const { error } = await supabase
      .from("match_recordings")
      .delete()
      .eq("id", videoId);

    if (error) {
      console.error("Error deleting video:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/play/videos/[videoId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
