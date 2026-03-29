"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bookmark,
  Phone,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface InteractionListItem {
  id: string;
  status: string;
  agentName: string | null;
  customerName: string | null;
  direction: string | null;
  duration: number | null;
  sentiment: string | null;
  score: number | null;
  createdAt: string;
  _count: {
    interactionOutcomes: number;
    interactionStrengths: number;
    interactionWeaknesses: number;
    interactionMissedOpportunities: number;
  };
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SentimentIcon({ sentiment }: { sentiment: string | null }) {
  switch (sentiment) {
    case "positive":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "negative":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-400" />;
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "PROCESSING":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "FAILED":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

export default function SavedPage() {
  const router = useRouter();
  const [interactions, setInteractions] = useState<InteractionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchSaved = useCallback(async () => {
    try {
      const params = new URLSearchParams({ saved: "true", limit: String(pageSize), offset: String(page * pageSize) });
      const res = await fetch(`/api/interactions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setInteractions(json.data);
        setTotal(json.total);
      } else {
        toast.error("Failed to load saved interactions");
      }
    } catch {
      toast.error("Failed to load saved interactions");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const unsave = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/interactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSaved: false }),
      });
      if (res.ok) {
        setInteractions((prev) => prev.filter((i) => i.id !== id));
        toast.success("Bookmark removed");
      } else {
        toast.error("Failed to remove bookmark");
      }
    } catch {
      toast.error("Failed to remove bookmark");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
          <Bookmark className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Saved</h1>
          <p className="text-sm text-gray-500">Bookmarked interactions for quick access</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      )}

      {!loading && interactions.length === 0 && (
        <div className="text-center py-16">
          <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No saved interactions yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Bookmark interactions from the detail page to find them here
          </p>
        </div>
      )}

      {!loading && interactions.length > 0 && (
        <div className="space-y-2">
          {interactions.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/voice-jar/${item.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-sky-300 dark:hover:border-sky-700 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <StatusIcon status={item.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.customerName || "Unknown Caller"}
                    </span>
                    {item.agentName && (
                      <span className="text-xs text-gray-400">Agent: {item.agentName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <Phone className="h-3 w-3" />
                      {item.direction || "inbound"}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDuration(item.duration)}
                    </span>
                    <span>
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {item.score !== null && (
                    <div className="text-center">
                      <span
                        className={`text-lg font-bold ${
                          item.score >= 75 ? "text-green-600" : item.score >= 50 ? "text-amber-600" : "text-red-600"
                        }`}
                      >
                        {item.score}
                      </span>
                      <span className="text-xs text-gray-400 block -mt-0.5">score</span>
                    </div>
                  )}
                  <SentimentIcon sentiment={item.sentiment} />
                  {item._count && (
                    <div className="flex gap-1.5 text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                        {item._count.interactionStrengths}S
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                        {item._count.interactionWeaknesses}W
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                        {item._count.interactionMissedOpportunities}M
                      </span>
                    </div>
                  )}
                  <button
                    onClick={(e) => unsave(e, item.id)}
                    className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    title="Remove from saved"
                  >
                    <Bookmark className="h-4 w-4 text-amber-500 fill-amber-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > pageSize && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-500">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * pageSize >= total}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
