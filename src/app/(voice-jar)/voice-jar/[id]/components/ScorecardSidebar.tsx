"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Loader2,
  Bot,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface QuestionScore {
  id: string;
  questionId: string;
  questionText: string;
  score: number;
  maxPoints: number;
  passed: boolean;
  notes: string | null;
}

interface EvalScore {
  id: string;
  criteriaId: string;
  criteriaName: string;
  score: number;
  notes: string | null;
  questionScores: QuestionScore[];
}

interface EvalDetail {
  id: string;
  totalScore: number | null;
  evaluationType: string;
  template: {
    name: string;
    criteria: Array<{
      id: string;
      name: string;
      weight: number;
      maxScore: number;
      questions: Array<{ id: string; text: string; maxPoints: number }>;
    }>;
  };
  scores: EvalScore[];
}

export default function ScorecardSidebar({ evaluationId }: { evaluationId: string }) {
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<EvalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());

  const fetchEvaluation = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}`);
      if (res.ok) {
        setEvaluation(await res.json());
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [evaluationId]);

  useEffect(() => {
    fetchEvaluation();
  }, [fetchEvaluation]);

  const toggleCriteria = (scoreId: string) => {
    setExpandedCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(scoreId)) next.delete(scoreId);
      else next.add(scoreId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
        </div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs text-gray-500 text-center py-3">Failed to load scorecard</p>
        <button onClick={fetchEvaluation} className="block mx-auto text-xs text-violet-600 hover:text-violet-700">
          Retry
        </button>
      </div>
    );
  }

  if (!evaluation.scores || evaluation.scores.length === 0) return null;

  const isAI = evaluation.evaluationType === "ai";
  const scoreColor = evaluation.totalScore !== null
    ? evaluation.totalScore >= 75 ? "text-green-600" : evaluation.totalScore >= 50 ? "text-amber-600" : "text-red-600"
    : "text-gray-400";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <ClipboardCheck className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
              {evaluation.template.name}
            </span>
            {isAI && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 flex-shrink-0">
                <Bot className="h-2.5 w-2.5" />
                AI
              </span>
            )}
          </div>
          {evaluation.totalScore !== null && (
            <span className={`text-lg font-bold ${scoreColor} flex-shrink-0 ml-2`}>
              {evaluation.totalScore}<span className="text-xs text-gray-400">/100</span>
            </span>
          )}
        </div>
      </div>

      {/* Criteria Scores */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {evaluation.scores.map((score) => {
          const criteria = evaluation.template.criteria.find((c) => c.id === score.criteriaId);
          const hasQuestions = score.questionScores && score.questionScores.length > 0;
          const isExpanded = expandedCriteria.has(score.id);

          const maxScore = hasQuestions
            ? score.questionScores.reduce((s, q) => s + q.maxPoints, 0)
            : (criteria?.maxScore || 10);
          const pct = maxScore > 0 ? Math.round((score.score / maxScore) * 100) : 0;
          const barColor = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
          const textColor = pct >= 75 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600";

          return (
            <div key={score.id}>
              <div
                className={`px-3 py-2 ${hasQuestions ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750" : ""}`}
                onClick={() => hasQuestions && toggleCriteria(score.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 min-w-0">
                    {hasQuestions && (
                      isExpanded
                        ? <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        : <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{score.criteriaName}</span>
                  </div>
                  <span className={`text-xs font-semibold ${textColor} flex-shrink-0 ml-1`}>
                    {score.score}/{maxScore}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Expanded question scores */}
              {hasQuestions && isExpanded && (
                <div className="bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                  {score.questionScores.map((qs) => (
                    <div key={qs.id} className="px-3 py-2 border-b border-gray-100/50 dark:border-gray-700/50 last:border-b-0">
                      <div className="flex items-start gap-1.5">
                        {qs.passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">{qs.questionText}</p>
                            <span className={`text-xs font-semibold flex-shrink-0 ${qs.passed ? "text-green-600" : "text-red-600"}`}>
                              {qs.score}/{qs.maxPoints}
                            </span>
                          </div>
                          {qs.notes && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{qs.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* View Full link */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => router.push(`/voice-jar/evaluate/${evaluation.id}`)}
          className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
        >
          View Full Evaluation
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
