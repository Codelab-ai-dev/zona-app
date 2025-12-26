"use client";

import { VideoPlayer } from "@/components/play/video-player";

interface VideoPlayerWrapperProps {
  playbackId: string;
  title?: string;
  poster?: string;
}

export function VideoPlayerWrapper({ playbackId, title, poster }: VideoPlayerWrapperProps) {
  return (
    <VideoPlayer
      playbackId={playbackId}
      title={title}
      poster={poster}
      className="w-full h-full"
    />
  );
}
