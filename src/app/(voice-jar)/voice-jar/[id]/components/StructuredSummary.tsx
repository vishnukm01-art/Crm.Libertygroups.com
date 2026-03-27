"use client";

import AnalysisItemList, { type AnalysisItem } from "./AnalysisItemList";

interface SummaryJson {
  overview?: string;
  keyPoints?: string[];
  actionItems?: string[];
  customerSentiment?: string;
  agentPerformance?: string;
}

interface StructuredSummaryProps {
  summaryJson: SummaryJson | null;
  outcomes: AnalysisItem[];
  strengths: AnalysisItem[];
  weaknesses: AnalysisItem[];
  missedOpportunities: AnalysisItem[];
}

export default function StructuredSummary({
  summaryJson,
  outcomes,
  strengths,
  weaknesses,
  missedOpportunities,
}: StructuredSummaryProps) {
  if (!summaryJson && outcomes.length === 0 && strengths.length === 0 && weaknesses.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        No analysis available yet. Processing may still be in progress.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Overview */}
      {summaryJson && (
        <div className="space-y-4">
          {summaryJson.overview && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Overview</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{summaryJson.overview}</p>
            </div>
          )}

          {summaryJson.keyPoints && summaryJson.keyPoints.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Key Points</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                {summaryJson.keyPoints.map((kp, i) => (
                  <li key={i}>{kp}</li>
                ))}
              </ul>
            </div>
          )}

          {summaryJson.actionItems && summaryJson.actionItems.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Action Items</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                {summaryJson.actionItems.map((ai, i) => (
                  <li key={i}>{ai}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {summaryJson.customerSentiment && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">Customer Sentiment</h5>
                <p className="text-sm text-gray-700 dark:text-gray-300">{summaryJson.customerSentiment}</p>
              </div>
            )}
            {summaryJson.agentPerformance && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">Agent Performance</h5>
                <p className="text-sm text-gray-700 dark:text-gray-300">{summaryJson.agentPerformance}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* O/S/W/MO Sections */}
      <AnalysisItemList items={outcomes} theme="blue" label="Outcomes" />
      <AnalysisItemList items={strengths} theme="green" label="Strengths" />
      <AnalysisItemList items={weaknesses} theme="red" label="Weaknesses" />
      <AnalysisItemList items={missedOpportunities} theme="amber" label="Missed Opportunities" />
    </div>
  );
}
