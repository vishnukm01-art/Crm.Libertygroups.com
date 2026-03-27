"use client";

import { createContext, useContext, useRef, useCallback, type ReactNode } from "react";

interface AudioPlayerContextValue {
  seekTo: (seconds: number) => void;
  registerSeek: (fn: (seconds: number) => void) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const seekRef = useRef<((seconds: number) => void) | null>(null);

  const seekTo = useCallback((seconds: number) => {
    seekRef.current?.(seconds);
  }, []);

  const registerSeek = useCallback((fn: (seconds: number) => void) => {
    seekRef.current = fn;
  }, []);

  return (
    <AudioPlayerContext.Provider value={{ seekTo, registerSeek }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}

export function useAudioPlayerOptional() {
  return useContext(AudioPlayerContext);
}
