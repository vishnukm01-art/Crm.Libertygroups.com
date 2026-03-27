import OpenAI from "openai";
import { type Uploadable } from "openai/uploads";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface TimestampedTranscription {
  text: string;
  segments: WhisperSegment[];
}

export interface TimeReference {
  startTime: number;
  endTime: number;
  label: string;
}

export interface AnalysisItem {
  name: string;
  description: string;
  timeReferences: TimeReference[];
}

export interface TranscriptAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  outcomes: AnalysisItem[];
  strengths: AnalysisItem[];
  weaknesses: AnalysisItem[];
  missedOpportunities: AnalysisItem[];
}

export interface StructuredSummary {
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  customerSentiment: string;
  agentPerformance: string;
  missedOpportunities: AnalysisItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function buildTimestampedTranscript(segments: WhisperSegment[]): string {
  return segments
    .map((seg) => `[${formatTime(seg.start)}-${formatTime(seg.end)}] ${seg.text.trim()}`)
    .join("\n");
}

// ─── Whisper Transcription ───────────────────────────────────────────────────

export async function transcribeAudio(file: Uploadable): Promise<string> {
  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    response_format: "text",
  });
  return response as unknown as string;
}

export async function transcribeAudioWithTimestamps(
  file: Uploadable
): Promise<TimestampedTranscription> {
  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  const data = response as unknown as {
    text: string;
    segments?: Array<{ start: number; end: number; text: string }>;
  };

  return {
    text: data.text || "",
    segments: (data.segments || []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })),
  };
}

// ─── GPT Transcript Analysis ─────────────────────────────────────────────────

export async function analyseTranscript(
  transcript: string,
  timestampedTranscript?: string
): Promise<TranscriptAnalysis> {
  const inputText = timestampedTranscript || transcript;

  const systemPrompt = `You are a call quality analyst for a financial services company. Analyze the following customer interaction transcript and return a JSON object.

The transcript may include timestamps in [MM:SS-MM:SS] format. When referencing specific moments, include timeReferences that correspond to those timestamps.

Return this exact JSON structure:
{
  "sentiment": "positive" | "neutral" | "negative",
  "score": <number 0-100 representing overall call quality>,
  "outcomes": [
    {
      "name": "<short outcome title>",
      "description": "<detailed description>",
      "timeReferences": [{ "startTime": <seconds>, "endTime": <seconds>, "label": "MM:SS-MM:SS" }]
    }
  ],
  "strengths": [
    {
      "name": "<short strength title>",
      "description": "<what the agent did well>",
      "timeReferences": [{ "startTime": <seconds>, "endTime": <seconds>, "label": "MM:SS-MM:SS" }]
    }
  ],
  "weaknesses": [
    {
      "name": "<short weakness title>",
      "description": "<what could be improved>",
      "timeReferences": [{ "startTime": <seconds>, "endTime": <seconds>, "label": "MM:SS-MM:SS" }]
    }
  ],
  "missedOpportunities": [
    {
      "name": "<short title>",
      "description": "<what the agent should have done based on the call context>",
      "timeReferences": [{ "startTime": <seconds>, "endTime": <seconds>, "label": "MM:SS-MM:SS" }]
    }
  ]
}

Provide 2-4 items for each category. If no timestamps are available, return empty timeReferences arrays.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: inputText },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from GPT analysis");

  return JSON.parse(content) as TranscriptAnalysis;
}

// ─── GPT Structured Summary ──────────────────────────────────────────────────

export async function generateStructuredSummary(
  transcript: string,
  timestampedTranscript?: string
): Promise<StructuredSummary> {
  const inputText = timestampedTranscript || transcript;

  const systemPrompt = `You are a call quality analyst. Generate a structured summary of this customer interaction transcript.

The transcript may include timestamps in [MM:SS-MM:SS] format. When suggesting missed opportunities, reference specific moments.

Return this exact JSON structure:
{
  "overview": "<2-3 sentence summary of the call>",
  "keyPoints": ["<key point 1>", "<key point 2>", ...],
  "actionItems": ["<action item 1>", "<action item 2>", ...],
  "customerSentiment": "<description of customer's emotional state throughout the call>",
  "agentPerformance": "<assessment of agent's performance>",
  "missedOpportunities": [
    {
      "name": "<short title>",
      "description": "<what could have been done differently>",
      "timeReferences": [{ "startTime": <seconds>, "endTime": <seconds>, "label": "MM:SS-MM:SS" }]
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: inputText },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from GPT summary");

  return JSON.parse(content) as StructuredSummary;
}
