import OpenAI from "openai";
import { type Uploadable } from "openai/uploads";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

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

// ─── Scorecard Evaluation Types ──────────────────────────────────────────────

export interface ScorecardQuestionInput {
  questionId: string;
  text: string;
  maxPoints: number;
}

export interface ScorecardCriteriaInput {
  criteriaId: string;
  name: string;
  weight: number;
  questions: ScorecardQuestionInput[];
}

export interface QuestionEvaluationResult {
  questionId: string;
  score: number;
  maxPoints: number;
  passed: boolean;
  notes: string;
}

export interface CriteriaEvaluationResult {
  criteriaId: string;
  totalScore: number;
  questions: QuestionEvaluationResult[];
}

export interface ScorecardEvaluationResult {
  criteria: CriteriaEvaluationResult[];
  overallNotes: string;
  totalScore: number;
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

  const systemPrompt = `You are a senior call quality analyst for a financial services company. Analyze the following customer interaction transcript and return a JSON object.

The transcript may include timestamps in [MM:SS-MM:SS] format. When referencing specific moments, embed timestamps naturally in your descriptions (e.g., "at 01:06") and also include timeReferences arrays.

IMPORTANT: Each description MUST be a detailed paragraph of 3-5 sentences. Include:
- Specific quotes from the transcript in quotation marks
- Timestamps embedded naturally in the text (e.g., "at 01:06", "from 02:15 to 03:30")
- For weaknesses: include an "Improvement:" sentence at the end suggesting what the agent should have done differently
- For missed opportunities: explain the context, what happened, and what the ideal action would have been

Return this exact JSON structure:
{
  "sentiment": "positive" | "neutral" | "negative",
  "score": <number 0-100 representing overall call quality>,
  "outcomes": [
    {
      "name": "<short outcome title>",
      "description": "<detailed paragraph 3-5 sentences with quotes and timestamps>",
      "timeReferences": [{ "startTime": <seconds>, "endTime": <seconds>, "label": "MM:SS-MM:SS" }]
    }
  ],
  "strengths": [
    {
      "name": "<short strength title>",
      "description": "<detailed paragraph 3-5 sentences describing what the agent did well, with specific quotes and timestamps>",
      "timeReferences": [{ "startTime": <seconds>, "endTime": <seconds>, "label": "MM:SS-MM:SS" }]
    }
  ],
  "weaknesses": [
    {
      "name": "<short weakness title>",
      "description": "<detailed paragraph 3-5 sentences describing the issue with quotes and timestamps. End with 'Improvement:' followed by a specific suggestion>",
      "timeReferences": [{ "startTime": <seconds>, "endTime": <seconds>, "label": "MM:SS-MM:SS" }]
    }
  ],
  "missedOpportunities": [
    {
      "name": "<short title>",
      "description": "<detailed paragraph 3-5 sentences explaining the situation, what happened, and what the agent should have done, with quotes and timestamps>",
      "timeReferences": [{ "startTime": <seconds>, "endTime": <seconds>, "label": "MM:SS-MM:SS" }]
    }
  ]
}

Provide 2-5 items for each category. If no timestamps are available, return empty timeReferences arrays.`;

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

// ─── GPT Scorecard Evaluation ────────────────────────────────────────────────

export async function evaluateTranscriptAgainstScorecard(
  transcript: string,
  criteriaList: ScorecardCriteriaInput[]
): Promise<ScorecardEvaluationResult> {
  // Build the scorecard section of the prompt dynamically
  const scorecardDescription = criteriaList
    .map((c, ci) => {
      const qLines = c.questions
        .map(
          (q, qi) =>
            `    Q${ci + 1}.${qi + 1} (id: "${q.questionId}", maxPoints: ${q.maxPoints}): "${q.text}"`
        )
        .join("\n");
      return `  Section "${c.name}" (criteriaId: "${c.criteriaId}", weight: ${c.weight}%):\n${qLines}`;
    })
    .join("\n\n");

  const systemPrompt = `You are a senior call quality evaluator. You will evaluate a customer interaction transcript against a specific scorecard with criteria sections and questions.

For each question, you must:
1. Determine if the question requirement was met (passed: true/false)
2. Award points from 0 to the question's maxPoints
3. Write detailed notes (2-4 sentences) explaining your scoring decision. ALWAYS cite specific quotes from the transcript in quotation marks to justify your score. Be specific about what was said or not said.

SCORECARD:
${scorecardDescription}

Return this exact JSON structure:
{
  "criteria": [
    {
      "criteriaId": "<the criteriaId from above>",
      "totalScore": <sum of all question scores in this section>,
      "questions": [
        {
          "questionId": "<the questionId from above>",
          "score": <points awarded, 0 to maxPoints>,
          "maxPoints": <maxPoints for this question>,
          "passed": <true if the requirement was met>,
          "notes": "<2-4 sentences with specific transcript quotes explaining your scoring>"
        }
      ]
    }
  ],
  "overallNotes": "<2-3 sentence overall assessment of the call against this scorecard>",
  "totalScore": <weighted overall percentage 0-100 based on section weights>
}

Score fairly and precisely. Award full points only when the requirement is clearly demonstrated in the transcript. Award partial points when partially met. Award 0 when not met at all.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: transcript },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from GPT scorecard evaluation");

  return JSON.parse(content) as ScorecardEvaluationResult;
}
