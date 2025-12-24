import Mux from "@mux/mux-node";

// Cliente de Mux (singleton)
let muxClient: Mux | null = null;

export function getMuxClient(): Mux {
  if (!muxClient) {
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;

    if (!tokenId || !tokenSecret) {
      throw new Error(
        "Missing Mux credentials. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET in .env.local"
      );
    }

    muxClient = new Mux({
      tokenId,
      tokenSecret,
    });
  }

  return muxClient;
}

// Helpers para Video
export const MuxVideo = {
  /**
   * Crear un upload URL para subir video directamente a Mux
   */
  async createUploadUrl() {
    const mux = getMuxClient();

    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ["public"],
        encoding_tier: "baseline", // 'baseline' es más económico, 'smart' mejor calidad
      },
      cors_origin: "*", // En producción, especifica tu dominio
    });

    return {
      uploadId: upload.id,
      uploadUrl: upload.url,
    };
  },

  /**
   * Obtener info de un asset
   */
  async getAsset(assetId: string) {
    const mux = getMuxClient();
    return await mux.video.assets.retrieve(assetId);
  },

  /**
   * Obtener el playback ID de un asset
   */
  async getPlaybackId(assetId: string): Promise<string | null> {
    const asset = await this.getAsset(assetId);
    return asset.playback_ids?.[0]?.id || null;
  },

  /**
   * Crear asset desde URL (para videos ya hospedados)
   */
  async createAssetFromUrl(videoUrl: string) {
    const mux = getMuxClient();

    const asset = await mux.video.assets.create({
      input: [{ url: videoUrl }],
      playback_policy: ["public"],
      encoding_tier: "baseline",
    });

    return {
      assetId: asset.id,
      playbackId: asset.playback_ids?.[0]?.id,
      status: asset.status,
    };
  },

  /**
   * Eliminar un asset
   */
  async deleteAsset(assetId: string) {
    const mux = getMuxClient();
    await mux.video.assets.delete(assetId);
  },

  /**
   * Obtener thumbnail URL
   */
  getThumbnailUrl(playbackId: string, options?: { time?: number; width?: number }) {
    const time = options?.time || 0;
    const width = options?.width || 640;
    return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}&width=${width}`;
  },

  /**
   * Obtener URL del video para streaming
   */
  getStreamUrl(playbackId: string) {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  },
};

// Helpers para Live Streaming
export const MuxLive = {
  /**
   * Crear un live stream
   */
  async createLiveStream() {
    const mux = getMuxClient();

    const stream = await mux.video.liveStreams.create({
      playback_policy: ["public"],
      new_asset_settings: {
        playback_policy: ["public"],
      },
      // Reducir latencia para streaming deportivo
      latency_mode: "low",
      // Grabar automáticamente
      // record: true, // Descomentar cuando quieras grabar streams
    });

    return {
      streamId: stream.id,
      streamKey: stream.stream_key,
      playbackId: stream.playback_ids?.[0]?.id,
      rtmpUrl: "rtmps://global-live.mux.com:443/app",
    };
  },

  /**
   * Obtener info de un live stream
   */
  async getLiveStream(streamId: string) {
    const mux = getMuxClient();
    return await mux.video.liveStreams.retrieve(streamId);
  },

  /**
   * Terminar un live stream
   */
  async endLiveStream(streamId: string) {
    const mux = getMuxClient();
    await mux.video.liveStreams.disable(streamId);
  },

  /**
   * Eliminar un live stream
   */
  async deleteLiveStream(streamId: string) {
    const mux = getMuxClient();
    await mux.video.liveStreams.delete(streamId);
  },
};
