import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Admin client para operaciones que necesitan bypass de RLS
const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

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
          home_team:teams!matches_home_team_id_fkey (id, name),
          away_team:teams!matches_away_team_id_fkey (id, name),
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
    const supabase = getAdminClient();

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
      "home_score",
      "away_score",
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
    const supabase = getAdminClient();

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
