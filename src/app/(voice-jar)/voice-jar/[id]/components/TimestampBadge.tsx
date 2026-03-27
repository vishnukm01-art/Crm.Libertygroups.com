"use client";

import { Clock } from "lucide-react";
import { useAudioPlayerOptional } from "./AudioPlayerContext";

interface TimestampBadgeProps {
  label: string;
  startTime: number;
}

export default function TimestampBadge({ label, startTime }: TimestampBadgeProps) {
  const audio = useAudioPlayerOptional();

  return (
    <button
      type="button"
      onClick={() => audio?.seekTo(startTime)}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono rounded bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 transition-colors cursor-pointer dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-900/40"
      title={`Jump to ${label}`}
    >
      <Clock className="h-3 w-3" />
      {label}
    </button>
  );
}
