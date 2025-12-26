import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Mux from "@mux/mux-node";

// Lazy initialization to avoid build-time errors
const getMux = () => new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/play/videos/[videoId]/refresh - Verificar estado en Mux y actualizar BD
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    const mux = getMux();
    const supabaseAdmin = getSupabaseAdmin();

    // Obtener el registro de la BD
    const { data: recording, error: fetchError } = await supabaseAdmin
      .from("match_recordings")
      .select("*")
      .eq("id", videoId)
      .single();

    if (fetchError || !recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Si ya está ready, no hacer nada
    if (recording.status === "ready") {
      return NextResponse.json({ message: "Already ready", recording });
    }

    // El mux_asset_id puede ser un upload ID o asset ID dependiendo del flujo
    const muxId = recording.mux_asset_id;
    if (!muxId) {
      return NextResponse.json({ error: "No Mux ID found" }, { status: 400 });
    }

    // Intentar obtener el upload primero (ya que guardamos el upload ID)
    try {
      const upload = await mux.video.uploads.retrieve(muxId);

      if (upload.status === "asset_created" && upload.asset_id) {
        // El asset fue creado, obtener info del asset
        const asset = await mux.video.assets.retrieve(upload.asset_id);

        if (asset.status === "ready") {
          const playbackId = asset.playback_ids?.[0]?.id;
          const duration = asset.duration;

          // Actualizar en BD
          const { data: updated, error: updateError } = await supabaseAdmin
            .from("match_recordings")
            .update({
              status: "ready",
              mux_asset_id: asset.id,
              mux_playback_id: playbackId,
              duration_seconds: duration ? Math.round(duration) : null,
              thumbnail_url: playbackId
                ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10`
                : null,
              published_at: new Date().toISOString(),
            })
            .eq("id", videoId)
            .select()
            .single();

          if (updateError) {
            console.error("Error updating recording:", updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
          }

          return NextResponse.json({
            message: "Video is ready!",
            recording: updated,
          });
        } else if (asset.status === "preparing") {
          return NextResponse.json({
            message: "Video is still processing",
            mux_status: asset.status,
          });
        } else if (asset.status === "errored") {
          await supabaseAdmin
            .from("match_recordings")
            .update({
              status: "failed",
              error_message: "Mux processing failed",
            })
            .eq("id", videoId);

          return NextResponse.json({
            message: "Video processing failed",
            mux_status: asset.status,
          });
        }
      } else if (upload.status === "waiting") {
        return NextResponse.json({
          message: "Still waiting for upload",
          mux_status: upload.status,
        });
      } else if (upload.status === "errored") {
        await supabaseAdmin
          .from("match_recordings")
          .update({
            status: "failed",
            error_message: "Upload failed",
          })
          .eq("id", videoId);

        return NextResponse.json({
          message: "Upload failed",
          mux_status: upload.status,
        });
      }

      return NextResponse.json({
        message: "Processing",
        mux_status: upload.status,
      });

    } catch (uploadError) {
      // Si no es un upload ID, intentar como asset ID
      try {
        const asset = await mux.video.assets.retrieve(muxId);

        if (asset.status === "ready") {
          const playbackId = asset.playback_ids?.[0]?.id;
          const duration = asset.duration;

          const { data: updated } = await supabaseAdmin
            .from("match_recordings")
            .update({
              status: "ready",
              mux_playback_id: playbackId,
              duration_seconds: duration ? Math.round(duration) : null,
              thumbnail_url: playbackId
                ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10`
                : null,
              published_at: new Date().toISOString(),
            })
            .eq("id", videoId)
            .select()
            .single();

          return NextResponse.json({
            message: "Video is ready!",
            recording: updated,
          });
        }

        return NextResponse.json({
          message: "Processing",
          mux_status: asset.status,
        });

      } catch (assetError) {
        return NextResponse.json({
          error: "Could not find asset in Mux",
          details: String(assetError),
        }, { status: 404 });
      }
    }

  } catch (error) {
    console.error("Error refreshing video status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
