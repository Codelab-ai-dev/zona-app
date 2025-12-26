import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase con service role para webhooks (no hay sesión de usuario)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase credentials for admin client");
  }

  return createClient(url, serviceKey);
}

// POST /api/play/webhooks/mux - Recibir webhooks de Mux
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    console.log("Mux webhook received:", type);

    const supabase = getSupabaseAdmin();

    switch (type) {
      // Video subido y listo para procesar
      case "video.upload.asset_created": {
        const uploadId = data.id;
        const assetId = data.asset_id;

        // Actualizar el registro con el asset ID real
        await supabase
          .from("match_recordings")
          .update({
            mux_asset_id: assetId,
            status: "processing",
          })
          .eq("mux_asset_id", uploadId); // Buscamos por el upload ID temporal

        console.log(`Upload ${uploadId} → Asset ${assetId}, processing...`);
        break;
      }

      // Video procesado y listo
      case "video.asset.ready": {
        const assetId = data.id;
        const playbackId = data.playback_ids?.[0]?.id;
        const duration = data.duration;
        const resolution = data.max_stored_resolution;

        // Generar thumbnail URL
        const thumbnailUrl = playbackId
          ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10&width=640`
          : null;

        // Actualizar el registro
        const { error } = await supabase
          .from("match_recordings")
          .update({
            mux_playback_id: playbackId,
            status: "ready",
            duration_seconds: Math.round(duration || 0),
            resolution: resolution || "1080p",
            thumbnail_url: thumbnailUrl,
            published_at: new Date().toISOString(),
          })
          .eq("mux_asset_id", assetId);

        if (error) {
          console.error("Error updating recording:", error);
        } else {
          console.log(`Asset ${assetId} ready! Playback ID: ${playbackId}`);
        }
        break;
      }

      // Error en el procesamiento
      case "video.asset.errored": {
        const assetId = data.id;
        const errorMessage = data.errors?.messages?.join(", ") || "Unknown error";

        await supabase
          .from("match_recordings")
          .update({
            status: "failed",
            error_message: errorMessage,
          })
          .eq("mux_asset_id", assetId);

        console.error(`Asset ${assetId} failed:`, errorMessage);
        break;
      }

      // Live stream activo
      case "video.live_stream.active": {
        const streamId = data.id;

        await supabase
          .from("live_streams")
          .update({
            status: "live",
            actual_start: new Date().toISOString(),
          })
          .eq("mux_live_stream_id", streamId);

        console.log(`Live stream ${streamId} is now active`);
        break;
      }

      // Live stream inactivo/terminado
      case "video.live_stream.idle": {
        const streamId = data.id;

        await supabase
          .from("live_streams")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
          })
          .eq("mux_live_stream_id", streamId);

        console.log(`Live stream ${streamId} ended`);
        break;
      }

      // Grabación del live stream lista
      case "video.asset.live_stream_completed": {
        const assetId = data.id;
        const playbackId = data.playback_ids?.[0]?.id;
        const duration = data.duration;
        const streamId = data.live_stream_id;

        // Actualizar el live_stream con la info de la grabación
        await supabase
          .from("live_streams")
          .update({
            recording_asset_id: assetId,
            recording_playback_id: playbackId,
            recording_duration: duration,
            recording_ready: true,
          })
          .eq("mux_live_stream_id", streamId);

        console.log(`Live stream recording ready: ${assetId}`);
        break;
      }

      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Mux webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Mux puede enviar GET para verificar el endpoint
export async function GET() {
  return NextResponse.json({ status: "ok", service: "mux-webhooks" });
}
