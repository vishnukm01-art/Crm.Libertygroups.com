"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  User,
  Calendar,
  Bot,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
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

interface EvaluationDetail {
  id: string;
  status: string;
  totalScore: number | null;
  evaluatorName: string | null;
  evaluationType: string;
  notes: string | null;
  createdAt: string;
  template: {
    name: string;
    criteria: Array<{
      id: string;
      name: string;
      description: string | null;
      weight: number;
      maxScore: number;
      questions: Array<{ id: string; text: string; maxPoints: number }>;
    }>;
  };
  interaction: {
    id: string;
    customerName: string | null;
    agentName: string | null;
    score: number | null;
    sentiment: string | null;
    duration: number | null;
    direction: string | null;
    createdAt: string;
  };
  scores: Array<{
    id: string;
    criteriaId: string;
    criteriaName: string;
    score: number;
    notes: string | null;
    questionScores: QuestionScore[];
  }>;
}

export default function EvaluationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<EvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());

  const fetchEvaluation = useCallback(async () => {
    try {
      const res = await fetch(`/api/evaluations/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data);
        // Auto-expand all criteria that have question scores
        const withQuestions = new Set<string>();
        data.scores?.forEach((s: EvaluationDetail["scores"][0]) => {
          if (s.questionScores && s.questionScores.length > 0) {
            withQuestions.add(s.id);
          }
        });
        setExpandedCriteria(withQuestions);
      }
    } catch {
      toast.error("Failed to load evaluation");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Evaluation not found</p>
        <button onClick={() => router.push("/voice-jar")} className="mt-2 text-violet-600 hover:text-violet-700 text-sm">
          Back to Voice Jar
        </button>
      </div>
    );
  }

  const isAI = evaluation.evaluationType === "ai";

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Evaluation Result</h1>
            {isAI ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                <Bot className="h-3 w-3" />
                AI Evaluation
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                Manual
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">Template: {evaluation.template.name}</p>
        </div>
        {evaluation.totalScore !== null && (
          <div className="text-center">
            <span className={`text-3xl font-bold ${evaluation.totalScore >= 75 ? "text-green-600" : evaluation.totalScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
              {evaluation.totalScore}
            </span>
            <span className="text-sm text-gray-400">/100</span>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Interaction</p>
            <button
              onClick={() => router.push(`/voice-jar/${evaluation.interaction.id}`)}
              className="text-violet-600 hover:text-violet-700"
            >
              {evaluation.interaction.customerName || "Unknown"} &mdash; Agent: {evaluation.interaction.agentName || "Unknown"}
            </button>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Evaluator</p>
            <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
              {isAI ? <Bot className="h-3.5 w-3.5 text-indigo-500" /> : <User className="h-3.5 w-3.5" />}
              {evaluation.evaluatorName || "Unknown"}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Date</p>
            <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(evaluation.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">AI Score</p>
            <span className="text-gray-700 dark:text-gray-300">
              {evaluation.interaction.score !== null ? `${evaluation.interaction.score}/100` : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-violet-500" />
          Criteria Scores
        </h2>
        {evaluation.scores.map((score) => {
          const criteria = evaluation.template.criteria.find((c) => c.id === score.criteriaId);
          const hasQuestions = score.questionScores && score.questionScores.length > 0;
          const isExpanded = expandedCriteria.has(score.id);

          // Compute percentage based on question totals or criteria maxScore
          const maxScore = hasQuestions
            ? score.questionScores.reduce((s, q) => s + q.maxPoints, 0)
            : (criteria?.maxScore || 10);
          const percentage = maxScore > 0 ? Math.round((score.score / maxScore) * 100) : 0;

          return (
            <div key={score.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div
                className={`p-4 ${hasQuestions ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750" : ""}`}
                onClick={() => hasQuestions && toggleCriteria(score.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {hasQuestions && (
                      isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{score.criteriaName}</span>
                    {criteria && <span className="text-xs text-gray-400">({criteria.weight}% weight)</span>}
                    {hasQuestions && <span className="text-xs text-gray-400">{score.questionScores.length} questions</span>}
                  </div>
                  <div>
                    <span className={`text-lg font-bold ${percentage >= 75 ? "text-green-600" : percentage >= 50 ? "text-amber-600" : "text-red-600"}`}>
                      {score.score}
                    </span>
                    <span className="text-sm text-gray-400">/{maxScore}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${percentage >= 75 ? "bg-green-500" : percentage >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {score.notes && !hasQuestions && <p className="text-xs text-gray-500 mt-2">{score.notes}</p>}
              </div>

              {/* Question-level scores */}
              {hasQuestions && isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                  {score.questionScores.map((qs) => (
                    <div key={qs.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div className="flex items-start gap-2">
                        {qs.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-800 dark:text-gray-200">{qs.questionText}</p>
                            <span className={`text-sm font-semibold ml-2 flex-shrink-0 ${qs.passed ? "text-green-600" : "text-red-600"}`}>
                              {qs.score}/{qs.maxPoints}
                            </span>
                          </div>
                          {qs.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{qs.notes}</p>
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

      {evaluation.notes && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Overall Notes</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{evaluation.notes}</p>
        </div>
      )}
    </div>
  );
}
