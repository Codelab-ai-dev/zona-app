import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MuxVideo } from "@/lib/mux/client";

// POST /api/play/upload - Crear URL de upload para subir video a Mux
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
      title,
      description,
      match_id,
      league_id,
      tournament_id,
      source_type = "manual",
    } = body;

    // Validar título
    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Crear upload URL en Mux
    const { uploadId, uploadUrl } = await MuxVideo.createUploadUrl();

    // Crear registro en la BD con status 'uploading'
    const { data: recording, error: dbError } = await supabase
      .from("match_recordings")
      .insert({
        title,
        description,
        match_id,
        league_id,
        tournament_id,
        source_type,
        status: "uploading",
        uploaded_by: user.id,
        // Guardamos el upload ID de Mux para rastrearlo
        mux_asset_id: uploadId, // Temporalmente guardamos el upload ID
      })
      .select()
      .single();

    if (dbError) {
      console.error("Error creating recording:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      recording,
      upload: {
        id: uploadId,
        url: uploadUrl,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/play/upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
