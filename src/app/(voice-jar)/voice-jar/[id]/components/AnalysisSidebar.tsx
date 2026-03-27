"use client";

import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import AnalysisItemList, { type AnalysisItem } from "./AnalysisItemList";

interface AnalysisSidebarProps {
  sentiment: string | null;
  score: number | null;
  outcomes: AnalysisItem[];
  strengths: AnalysisItem[];
  weaknesses: AnalysisItem[];
  missedOpportunities: AnalysisItem[];
}

function SentimentIcon({ sentiment }: { sentiment: string | null }) {
  switch (sentiment) {
    case "positive":
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    case "negative":
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    default:
      return <Minus className="h-5 w-5 text-gray-400" />;
  }
}

function scoreColor(score: number | null): string {
  if (!score) return "text-gray-400";
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export default function AnalysisSidebar({
  sentiment,
  score,
  outcomes,
  strengths,
  weaknesses,
  missedOpportunities,
}: AnalysisSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Score + Sentiment Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
          <Target className="h-4 w-4" />
          Call Analysis
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className={`text-3xl font-bold ${scoreColor(score)}`}>
              {score ?? "--"}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Quality Score</div>
          </div>
          <div className="text-center flex flex-col items-center justify-center">
            <SentimentIcon sentiment={sentiment} />
            <div className="text-xs text-gray-500 mt-1 capitalize">{sentiment || "Unknown"}</div>
          </div>
        </div>
      </div>

      {/* Analysis Items */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-5">
        <AnalysisItemList items={outcomes} theme="blue" label="Outcomes" />
        <AnalysisItemList items={strengths} theme="green" label="Strengths" />
        <AnalysisItemList items={weaknesses} theme="red" label="Weaknesses" />
        <AnalysisItemList items={missedOpportunities} theme="amber" label="Missed Opportunities" />
      </div>
    </div>
  );
}
