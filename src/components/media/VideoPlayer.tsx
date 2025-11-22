import React, { useEffect, useRef, useState } from "react";

type VideoPlayerProps = {
  src: string;
  poster?: string;
  className?: string;
};

// Simple custom video player with basic controls and no download option.
// Note: Users can still technically fetch the resource via DevTools; this removes visible download UI.
export default function VideoPlayer({ src, poster, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => setDuration(v.duration || 0);
    const onTime = () => setCurrentTime(v.currentTime || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [src]);

  // Track fullscreen state across browsers
  useEffect(() => {
    const onFsChange = () => {
      const docAny = document as unknown as {
        fullscreenElement?: Element | null;
        webkitFullscreenElement?: Element | null;
        msFullscreenElement?: Element | null;
      };
    
      const isFs = !!(docAny.fullscreenElement || docAny.webkitFullscreenElement || docAny.msFullscreenElement);
      setIsFullscreen(isFs);
    };

    const handler: EventListener = () => onFsChange();
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    document.addEventListener("MSFullscreenChange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
      document.removeEventListener("MSFullscreenChange", handler);
    };
  }, []);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }

  function onSeekChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    v.currentTime = t;
    setCurrentTime(t);
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    const v = videoRef.current as unknown as {
      webkitEnterFullscreen?: () => void;
      webkitExitFullscreen?: () => void;
    } | null;

    if (!el) return;

    const docAny = document as unknown as {
      exitFullscreen?: () => void;
      webkitExitFullscreen?: () => void;
      msExitFullscreen?: () => void;
      fullscreenElement?: Element | null;
      webkitFullscreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };

    const isFs = !!(docAny.fullscreenElement || docAny.webkitFullscreenElement || docAny.msFullscreenElement);

    if (isFs) {
      docAny.exitFullscreen?.();
      docAny.webkitExitFullscreen?.();
      docAny.msExitFullscreen?.();
      // iOS Safari fullscreen on video element
      v?.webkitExitFullscreen?.();
      return;
    }

    // Prefer native video fullscreen on iOS Safari
    if (v && typeof v.webkitEnterFullscreen === "function") {
      v.webkitEnterFullscreen();
      return;
    }

    const anyEl = el as unknown as {
      requestFullscreen?: () => void;
      webkitRequestFullscreen?: () => void;
      msRequestFullscreen?: () => void;
    };
    anyEl.requestFullscreen?.();
    anyEl.webkitRequestFullscreen?.();
    anyEl.msRequestFullscreen?.();
  }

  function formatTime(sec: number) {
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <div ref={containerRef} className={className}>
      <div className={`relative w-full overflow-hidden rounded-lg bg-black ${isFullscreen ? "h-screen" : ""}`}>
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          playsInline
          // Hide native controls and discourage download
          controls={false}
          controlsList="nodownload noplaybackrate"
          className={`w-full ${isFullscreen ? "h-screen max-h-none" : "h-auto max-h-[70vh]"}`}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="px-3 py-1.5 text-xs rounded-md bg-white/10 text-white hover:bg-white/20"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="px-3 py-1.5 text-xs rounded-md bg-white/10 text-white hover:bg-white/20"
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={onSeekChange}
                className="w-full"
              />
              <span className="text-[11px] text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3 py-1.5 text-xs rounded-md bg-white/10 text-white hover:bg-white/20"
            >
              {isFullscreen ? "Exit" : "Fullscreen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}