"use client";

import { useAudioPlayerOptional } from "./AudioPlayerContext";

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptTabProps {
  transcript: string | null;
  segments: WhisperSegment[] | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TranscriptTab({ transcript, segments }: TranscriptTabProps) {
  const audio = useAudioPlayerOptional();

  if (!transcript) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        No transcript available.
      </div>
    );
  }

  // If we have timestamped segments, render them interactively
  if (segments && segments.length > 0) {
    return (
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="group flex gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            onClick={() => audio?.seekTo(seg.start)}
          >
            <span className="flex-shrink-0 text-xs font-mono text-sky-600 dark:text-sky-400 mt-0.5 opacity-60 group-hover:opacity-100">
              {formatTime(seg.start)}
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {seg.text.trim()}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: plain text transcript
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none max-h-96 overflow-y-auto">
      <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
        {transcript}
      </pre>
    </div>
  );
}
