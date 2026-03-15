/**
 * player-context.tsx
 * Global music player state shared across all screens.
 * Wraps expo-audio's useAudioPlayer and exposes a mini-player interface.
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import type { Song } from "@/hooks/use-songs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerContextValue {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoaded: boolean;
  isBuffering: boolean;
  playSong: (song: Song, queue?: Song[]) => void;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  playNext: () => void;
  playPrev: () => void;
  setQueue: (songs: Song[]) => void;
  stop: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAudioUrl(song: Song): string {
  if (!song.fileName) return "";
  // Local songs are served from /api/music/<filename>
  if (song.source === "local") {
    // Derive the API base URL the same way constants/oauth.ts does
    if (typeof window !== "undefined" && window.location) {
      const { protocol, hostname } = window.location;
      const apiHostname = hostname.replace(/^8081-/, "3000-");
      const base = apiHostname !== hostname
        ? `${protocol}//${apiHostname}`
        : "";
      return `${base}/api/music/${encodeURIComponent(song.fileName)}`;
    }
    return `/api/music/${encodeURIComponent(song.fileName)}`;
  }
  return "";
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueueState] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  // Build the audio source URI for the current song
  const audioSource = currentSong ? buildAudioUrl(currentSong) : null;

  const player = useAudioPlayer(audioSource ?? undefined);
  const status = useAudioPlayerStatus(player);

  // When the song finishes, auto-advance to next
  useEffect(() => {
    if (status.didJustFinish) {
      playNextInternal();
    }
  }, [status.didJustFinish]);

  const playSong = useCallback(
    (song: Song, newQueue?: Song[]) => {
      const q = newQueue ?? queue;
      const idx = q.findIndex((s) => s.id === song.id);
      setCurrentSong(song);
      setQueueState(q);
      setQueueIndex(idx >= 0 ? idx : 0);
      // Replace source and play
      const url = buildAudioUrl(song);
      if (url) {
        player.replace(url);
        player.play();
      }
    },
    [player, queue]
  );

  const togglePlayPause = useCallback(() => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, status.playing]);

  const seekTo = useCallback(
    (seconds: number) => {
      player.seekTo(seconds);
    },
    [player]
  );

  const playNextInternal = useCallback(() => {
    if (queue.length === 0) return;
    const nextIdx = (queueIndex + 1) % queue.length;
    const nextSong = queue[nextIdx];
    setCurrentSong(nextSong);
    setQueueIndex(nextIdx);
    const url = buildAudioUrl(nextSong);
    if (url) {
      player.replace(url);
      player.play();
    }
  }, [player, queue, queueIndex]);

  const playNext = useCallback(() => {
    playNextInternal();
  }, [playNextInternal]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    // If more than 3 seconds in, restart current song
    if (status.currentTime > 3) {
      player.seekTo(0);
      return;
    }
    const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    const prevSong = queue[prevIdx];
    setCurrentSong(prevSong);
    setQueueIndex(prevIdx);
    const url = buildAudioUrl(prevSong);
    if (url) {
      player.replace(url);
      player.play();
    }
  }, [player, queue, queueIndex, status.currentTime]);

  const setQueue = useCallback((songs: Song[]) => {
    setQueueState(songs);
  }, []);

  const stop = useCallback(() => {
    player.pause();
    setCurrentSong(null);
  }, [player]);

  const value: PlayerContextValue = {
    currentSong,
    queue,
    isPlaying: status.playing,
    currentTime: status.currentTime ?? 0,
    duration: status.duration ?? 0,
    isLoaded: status.isLoaded ?? false,
    isBuffering: status.isBuffering ?? false,
    playSong,
    togglePlayPause,
    seekTo,
    playNext,
    playPrev,
    setQueue,
    stop,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used inside <PlayerProvider>");
  }
  return ctx;
}
